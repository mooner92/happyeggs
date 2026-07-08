import Phaser from 'phaser';
import { DEBUG, EGG, HEAT, ORDER, STAGE1 } from '../data/balance';
import { ANCHORS, FLIP_ANIM, SERVE_SWIPE_PX, TAP_MAX_MS, TEXT, toPx } from '../data/layout';
import { COOK_STATE_STYLE, HUD_TEXT, PALETTE } from '../data/palette';
import { CookingModel } from '../systems/CookingModel';
import type { BlobState } from '../systems/EggBlobModel';
import { createBlob, getPolygon, stepSpread } from '../systems/EggBlobModel';
import { bus } from '../systems/events';
import { judgeFlip, PowerGauge, type FlipOutcome } from '../systems/flip';
import { circularity, scoreFromQ } from '../systems/scoring';
import { StageSession } from '../systems/stage';
import { DebugHud } from '../ui/DebugHud';
import { CounterView } from '../ui/views/CounterView';
import { EggView } from '../ui/views/EggView';
import { HandsView } from '../ui/views/HandsView';
import { PanView } from '../ui/views/PanView';
import { PowerGaugeView } from '../ui/views/PowerGaugeView';
import { QueueView } from '../ui/views/QueueView';
import { ScorePopupView } from '../ui/views/ScorePopupView';
import { StageHudView } from '../ui/views/StageHudView';

const SEED_BASE = 12345;
const SEED_STEP = 7919;
/** 주문 생성용 고정 시드 (결정론) — 실난수 대신 LCG */
const STAGE_SEED = 20260708;

interface EggEntity {
  readonly id: number;
  readonly blob: BlobState;
  readonly cooking: CookingModel;
  readonly view: EggView;
  smokeCriticalEmitted: boolean;
  flipped: boolean;
  lost: boolean;
  outcome: FlipOutcome | null;
  offsetY: number;
  scaleX: number;
}

function foldBlob(blob: BlobState, scaleX: number): void {
  const cx = blob.cx;
  for (let i = 0; i < blob.verts.length; i += 2) {
    blob.verts[i] = cx + (blob.verts[i]! - cx) * scaleX;
  }
}

/**
 * 코어 플레이 씬 (M1) — 하드코딩 스테이지 1개.
 * 제스처: 짧은 탭=깨기(주문 수만큼) · 홀드-릴리즈=뒤집기(게이지) · 위로 스와이프=서빙(원형도 채점).
 * 스테이지 진행(큐·재고·클리어/실패)은 순수 모델 StageSession이 결정한다.
 */
export class GameScene extends Phaser.Scene {
  private pan!: PanView;
  private hud: DebugHud | null = null;
  private gauge!: PowerGaugeView;
  private scorePopup!: ScorePopupView;
  private queueView!: QueueView;
  private stageHud!: StageHudView;
  private readonly powerGauge = new PowerGauge();
  private session!: StageSession;

  private eggs: EggEntity[] = [];
  private nextEggId = 0;
  private ended = false;

  private charging = false;
  private flipping = false;
  private downAtMs = 0;
  private downPos = { x: 0, y: 0 };

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    new CounterView(this);
    this.pan = new PanView(this);
    new HandsView(this);
    this.gauge = new PowerGaugeView(this);
    this.scorePopup = new ScorePopupView(this);
    this.queueView = new QueueView(this);
    this.stageHud = new StageHudView(this);

    this.eggs = [];
    this.nextEggId = 0;
    this.ended = false;
    this.charging = false;
    this.flipping = false;

    // 하드코딩 스테이지 1 — 시드 LCG로 주문 결정론 생성
    let seed = STAGE_SEED;
    const randInt = (min: number, max: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return min + (seed % (max - min + 1));
    };
    this.session = StageSession.hardcoded(
      STAGE1.customers,
      STAGE1.orderMin,
      STAGE1.orderMax,
      STAGE1.spareEggs,
      ORDER.visibleCount,
      randInt,
    );
    this.refreshStageUi();

    const debugOff = new URLSearchParams(window.location.search).get('debug') === '0';
    this.hud = debugOff ? null : new DebugHud(this);

    const btnPos = toPx(ANCHORS.resultButton);
    this.add
      .text(btnPos.x, btnPos.y, 'RESULT ▸', { fontSize: TEXT.buttonSize, color: HUD_TEXT.normal })
      .setOrigin(1, 0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true })
      .on(
        Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
        (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.endStage();
        },
      );

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
      this.hud?.destroy();
      this.hud = null;
    });
  }

  private refreshStageUi(): void {
    this.queueView.render(this.session.visibleOrders);
    this.stageHud.render(
      this.session.remainingStock,
      this.session.servedScores.length,
      this.session.averageScore,
    );
  }

  private liveEggs(): EggEntity[] {
    return this.eggs.filter((e) => !e.lost);
  }

  private hasUnflipped(): boolean {
    return this.eggs.some((e) => !e.flipped && !e.lost);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.flipping || this.ended) return;
    this.downAtMs = this.time.now;
    this.downPos = { x: pointer.x, y: pointer.y };
    this.charging = this.hasUnflipped();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.flipping || this.ended) return;
    const heldMs = this.time.now - this.downAtMs;
    const dx = pointer.x - this.downPos.x;
    const dy = pointer.y - this.downPos.y;
    const drag = Math.hypot(dx, dy);
    this.charging = false;
    this.gauge.hide();

    const hasFlipped = this.eggs.some((e) => e.flipped && !e.lost);

    if (drag >= SERVE_SWIPE_PX && dy < 0 && hasFlipped) {
      this.serve();
      return;
    }
    if (heldMs >= TAP_MAX_MS && this.hasUnflipped()) {
      this.startFlip(this.powerGauge.valueAt(heldMs / 1000));
      return;
    }
    if (heldMs < TAP_MAX_MS && this.pan.containsPoint(pointer.x, pointer.y, EGG.INITIAL_RADIUS)) {
      this.crack(pointer.x, pointer.y);
    }
  }

  private crack(x: number, y: number): void {
    const order = this.session.currentOrder;
    if (!order) return;
    // 이번 주문 수만큼만, 재고가 있을 때만
    if (this.liveEggs().length >= order.eggCount) return;
    if (this.eggs.length >= DEBUG.MAX_EGGS) return;
    if (!this.session.consumeEgg()) return;

    const id = this.nextEggId++;
    this.eggs.push({
      id,
      blob: createBlob(SEED_BASE + id * SEED_STEP, x, y),
      cooking: new CookingModel(),
      view: new EggView(this, EGG.VERTEX_COUNT),
      smokeCriticalEmitted: false,
      flipped: false,
      lost: false,
      outcome: null,
      offsetY: 0,
      scaleX: 1,
    });
    bus.emit('egg:cracked', { eggId: id, x, y });
    this.refreshStageUi();
    this.checkStatus();
  }

  private startFlip(p: number): void {
    const targets = this.eggs.filter((e) => !e.flipped && !e.lost);
    if (targets.length === 0) return;
    this.flipping = true;
    this.gauge.hide();
    for (const e of targets) e.outcome = judgeFlip(e.cooking.state, p);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: FLIP_ANIM.durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const arc = -FLIP_ANIM.peakPx * Math.sin(Math.PI * (tw.getValue() ?? 0));
        for (const e of targets) e.offsetY = arc;
      },
      onComplete: () => {
        let burnt = false;
        for (const e of targets) burnt = this.resolveFlip(e) || burnt;
        this.flipping = false;
        if (burnt) this.failOrder();
      },
    });
  }

  /** 반환: 이 계란이 까만뒷면(주문 실패 유발)인지 */
  private resolveFlip(e: EggEntity): boolean {
    e.offsetY = 0;
    switch (e.outcome) {
      case 'CLEAN':
        e.flipped = true;
        e.scaleX = FLIP_ANIM.squashScaleX;
        this.tweens.addCounter({
          from: FLIP_ANIM.squashScaleX,
          to: 1,
          duration: FLIP_ANIM.squashMs,
          onUpdate: (tw) => (e.scaleX = tw.getValue() ?? 1),
        });
        return false;
      case 'HALF_FOLD':
        e.flipped = true;
        foldBlob(e.blob, FLIP_ANIM.foldScaleX);
        return false;
      case 'BURNT_FLIP':
        e.lost = true;
        this.flyOff(e);
        return true;
      case 'PROJECTILE':
      case 'FLEW_OFF':
      default:
        e.lost = true;
        this.flyOff(e);
        return false;
    }
  }

  private flyOff(e: EggEntity): void {
    this.tweens.addCounter({
      from: 0,
      to: -1000,
      duration: 420,
      ease: 'Cubic.easeIn',
      onUpdate: (tw) => (e.offsetY = tw.getValue() ?? 0),
      onComplete: () => {
        e.view.destroy();
        this.eggs = this.eggs.filter((x) => x !== e);
      },
    });
  }

  /** 까만뒷면 뒤집기 → 현재 손님 주문 실패(재고 도난) + 다음 손님 */
  private failOrder(): void {
    this.session.failCurrent();
    for (const e of this.eggs) e.view.destroy();
    this.eggs = [];
    this.refreshStageUi();
    this.checkStatus();
  }

  private serve(): void {
    const ready = this.eggs.filter((e) => e.flipped && !e.lost);
    if (ready.length === 0) return;
    const scores: number[] = [];
    for (const e of ready) {
      const score = scoreFromQ(circularity(getPolygon(e.blob)));
      scores.push(score);
      this.scorePopup.popup(e.blob.cx, e.blob.cy - 40, score);
      e.view.destroy();
    }
    this.eggs = this.eggs.filter((e) => !ready.includes(e));
    this.session.serveCurrent(scores);
    this.refreshStageUi();
    this.checkStatus();
  }

  private checkStatus(): void {
    if (this.session.status !== 'PLAYING') this.endStage();
  }

  private endStage(): void {
    if (this.ended) return;
    this.ended = true;
    this.scene.start('Result', {
      status: this.session.status,
      reason: this.session.failReason,
      average: this.session.averageScore,
      served: this.session.servedScores.length,
      failed: this.session.failedCount,
    });
  }

  override update(_time: number, deltaMs: number): void {
    const dtSec = Math.min(deltaMs / 1000, DEBUG.MAX_DT_SEC);

    for (const egg of this.eggs) {
      if (!egg.flipped && !egg.lost && !this.flipping) {
        stepSpread(egg.blob, dtSec);
        const before = egg.cooking.state;
        const transitions = egg.cooking.update(dtSec, HEAT.gas.base);
        let from = before;
        for (const to of transitions) {
          bus.emit('cook:stateChanged', { eggId: egg.id, from, to });
          from = to;
        }
        if (egg.cooking.smokeCriticalFired && !egg.smokeCriticalEmitted) {
          egg.smokeCriticalEmitted = true;
          bus.emit('cook:smokeCritical', { eggId: egg.id });
          // SMOKE 방치 → 스프링클러 → 즉시 실패 (GDD §5)
          this.session.forceFail('smoke');
          this.checkStatus();
        }
      }
      egg.view.draw(egg.blob, COOK_STATE_STYLE[egg.cooking.state], {
        offsetY: egg.offsetY,
        scaleX: egg.scaleX,
      });
    }

    if (this.charging && !this.flipping) {
      const heldMs = this.time.now - this.downAtMs;
      if (heldMs >= TAP_MAX_MS) {
        this.gauge.show();
        this.gauge.render(this.powerGauge.valueAt(heldMs / 1000));
      }
    }

    this.hud?.update(deltaMs, this.eggs, this.game.loop.actualFps);
  }
}
