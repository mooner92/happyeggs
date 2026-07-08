import Phaser from 'phaser';
import { DEBUG, EGG, HEAT } from '../data/balance';
import { ANCHORS, FLIP_ANIM, SERVE_SWIPE_PX, TAP_MAX_MS, TEXT, toPx } from '../data/layout';
import { COOK_STATE_STYLE, HUD_TEXT, PALETTE } from '../data/palette';
import { CookingModel } from '../systems/CookingModel';
import type { BlobState } from '../systems/EggBlobModel';
import { createBlob, getPolygon, stepSpread } from '../systems/EggBlobModel';
import { bus } from '../systems/events';
import { judgeFlip, PowerGauge, type FlipOutcome } from '../systems/flip';
import { circularity } from '../systems/scoring';
import { scoreFromQ } from '../systems/scoring';
import { DebugHud } from '../ui/DebugHud';
import { CounterView } from '../ui/views/CounterView';
import { EggView } from '../ui/views/EggView';
import { HandsView } from '../ui/views/HandsView';
import { PanView } from '../ui/views/PanView';
import { PowerGaugeView } from '../ui/views/PowerGaugeView';
import { ScorePopupView } from '../ui/views/ScorePopupView';

/** 시드 파생 상수 — 밸런스가 아닌 결정론 편의 값 */
const SEED_BASE = 12345;
const SEED_STEP = 7919;

interface EggEntity {
  readonly id: number;
  readonly blob: BlobState;
  readonly cooking: CookingModel;
  readonly view: EggView;
  smokeCriticalEmitted: boolean;
  /** 뒤집기 완료(익힘 정지, 서빙 대기) */
  flipped: boolean;
  /** 팬에서 소실(이탈/발사/까만뒷면) — 제거 대기 */
  lost: boolean;
  outcome: FlipOutcome | null;
  offsetY: number;
  scaleX: number;
}

/** 블롭 x정점을 중심 기준으로 접어 원형도를 떨어뜨린다 (반접힘) */
function foldBlob(blob: BlobState, scaleX: number): void {
  const cx = blob.cx;
  for (let i = 0; i < blob.verts.length; i += 2) {
    blob.verts[i] = cx + (blob.verts[i]! - cx) * scaleX;
  }
}

/**
 * 코어 플레이 씬 (M1 진행 중).
 * 제스처: 짧은 탭 = 계란 깨기 · 홀드-릴리즈 = 뒤집기(파워 게이지) · 위로 스와이프 = 서빙(원형도 채점).
 * 게임 규칙은 순수 모델(src/systems/)이 들고, 씬은 입력·애니·뷰 갱신·버스 발행만 한다.
 */
export class GameScene extends Phaser.Scene {
  private pan!: PanView;
  private hud: DebugHud | null = null;
  private gauge!: PowerGaugeView;
  private scorePopup!: ScorePopupView;
  private readonly powerGauge = new PowerGauge();

  private eggs: EggEntity[] = [];
  private nextEggId = 0;

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

    this.eggs = [];
    this.nextEggId = 0;
    this.charging = false;
    this.flipping = false;

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
          this.scene.start('Result');
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

  private hasUnflipped(): boolean {
    return this.eggs.some((e) => !e.flipped && !e.lost);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.flipping) return;
    this.downAtMs = this.time.now;
    this.downPos = { x: pointer.x, y: pointer.y };
    // 뒤집을 계란이 있으면 홀드 = 게이지 충전 후보
    this.charging = this.hasUnflipped();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.flipping) return;
    const heldMs = this.time.now - this.downAtMs;
    const dx = pointer.x - this.downPos.x;
    const dy = pointer.y - this.downPos.y;
    const drag = Math.hypot(dx, dy);
    this.charging = false;
    this.gauge.hide();

    const hasFlipped = this.eggs.some((e) => e.flipped && !e.lost);

    // 서빙 — 위로 스와이프 + 뒤집힌 계란 있음
    if (drag >= SERVE_SWIPE_PX && dy < 0 && hasFlipped) {
      this.serve();
      return;
    }
    // 뒤집기 — 탭 임계 이상 홀드 + 안 뒤집힌 계란 있음
    if (heldMs >= TAP_MAX_MS && this.hasUnflipped()) {
      this.startFlip(this.powerGauge.valueAt(heldMs / 1000));
      return;
    }
    // 깨기 — 짧은 탭 + 팬 안 + 여유
    if (
      heldMs < TAP_MAX_MS &&
      this.pan.containsPoint(pointer.x, pointer.y, EGG.INITIAL_RADIUS) &&
      this.eggs.length < DEBUG.MAX_EGGS
    ) {
      this.crack(pointer.x, pointer.y);
    }
  }

  private crack(x: number, y: number): void {
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
        for (const e of targets) this.resolveFlip(e);
        this.flipping = false;
      },
    });
  }

  private resolveFlip(e: EggEntity): void {
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
        break;
      case 'HALF_FOLD':
        e.flipped = true;
        foldBlob(e.blob, FLIP_ANIM.foldScaleX); // 폴리곤 자체를 접어 점수 폭락
        break;
      case 'PROJECTILE':
      case 'FLEW_OFF':
      case 'BURNT_FLIP':
      default:
        e.lost = true;
        this.flyOff(e);
        break;
    }
  }

  /** 소실 계란 — 위로(손님 방향) 날아가며 사라진다 */
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

  private serve(): void {
    const ready = this.eggs.filter((e) => e.flipped && !e.lost);
    if (ready.length === 0) return;
    for (const e of ready) {
      const q = circularity(getPolygon(e.blob));
      const score = scoreFromQ(q);
      this.scorePopup.popup(e.blob.cx, e.blob.cy - 40, score);
      e.view.destroy();
    }
    this.eggs = this.eggs.filter((e) => !ready.includes(e));
    // 손님 큐 진행·스테이지 클리어는 다음 증분(M1 스테이지 플로우)
  }

  override update(_time: number, deltaMs: number): void {
    const dtSec = Math.min(deltaMs / 1000, DEBUG.MAX_DT_SEC);

    for (const egg of this.eggs) {
      // 뒤집기 전·소실 전·애니 중이 아닐 때만 익힘 진행
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
        }
      }
      egg.view.draw(egg.blob, COOK_STATE_STYLE[egg.cooking.state], {
        offsetY: egg.offsetY,
        scaleX: egg.scaleX,
      });
    }

    // 게이지 — 탭 임계 넘겨 홀드 중일 때만 표시
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
