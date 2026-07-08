import Phaser from 'phaser';
import { DEBUG, EGG, HEAT, ORDER, SCORE, STAGE1 } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { ITEMS, ITEM_POS } from '../data/items';
import {
  ANCHORS,
  DEPTH,
  DESIGN,
  DOUBLE_TAP_MS,
  DRAG_CUT_PX,
  FLIP_ANIM,
  SERVE_SWIPE_PX,
  SPIDER,
  TAP_MAX_MS,
  TEXT,
  toPx,
} from '../data/layout';
import { COOK_STATE_STYLE, HUD_TEXT, PALETTE } from '../data/palette';
import { CookingModel } from '../systems/CookingModel';
import type { BlobState } from '../systems/EggBlobModel';
import { createBlob, getPolygon, stepSpread } from '../systems/EggBlobModel';
import type { InputKey } from '../systems/enemyDef';
import type { EventInstance } from '../systems/eventInstance';
import { EventScheduler, type RangeRng } from '../systems/eventScheduler';
import { bus } from '../systems/events';
import { judgeFlip, PowerGauge, type FlipOutcome } from '../systems/flip';
import { circularity, scoreFromQ } from '../systems/scoring';
import { StageSession } from '../systems/stage';
import type { StageDef } from '../systems/stageDef';
import { findStage, STAGES } from '../data/stages';
import { starsFor } from '../systems/stars';
import { recordResult, type KVStorage } from '../systems/save';
import { DebugHud } from '../ui/DebugHud';
import { CounterView } from '../ui/views/CounterView';
import type { EnemyView } from '../ui/views/EnemyView';
import { CatView, WebTrophyView } from '../ui/views/EventEffects';
import { EggView } from '../ui/views/EggView';
import { FlyView } from '../ui/views/FlyView';
import { HairView } from '../ui/views/HairView';
import { HandsView } from '../ui/views/HandsView';
import { ItemView } from '../ui/views/ItemView';
import { PanView } from '../ui/views/PanView';
import { PowerGaugeView } from '../ui/views/PowerGaugeView';
import { QueueView } from '../ui/views/QueueView';
import { RobberView } from '../ui/views/RobberView';
import { ScorePopupView } from '../ui/views/ScorePopupView';
import { SneezeView } from '../ui/views/SneezeView';
import { SpiderView } from '../ui/views/SpiderView';
import { SprinklerView } from '../ui/views/SprinklerView';
import { StageHudView } from '../ui/views/StageHudView';

const SEED_BASE = 12345;
const SEED_STEP = 7919;
const STAGE_SEED = 20260708;
const EVENT_SEED = 424242;

interface EggEntity {
  readonly id: number;
  readonly blob: BlobState;
  readonly cooking: CookingModel;
  readonly view: EggView;
  smokeCriticalEmitted: boolean;
  flipped: boolean;
  lost: boolean;
  /** 반토막 등으로 형태 고정 — 익힘/퍼짐 정지, 서빙 가능(대개 저점수) */
  frozen: boolean;
  yolkBroken: boolean;
  /** 머리카락 안착 감점(−10) 대상 (GDD §8.1 ④) */
  hairPenalty: boolean;
  /** 파리 똥 감점(−20) 대상 (GDD §8.1 ⑥) */
  flyPenalty: boolean;
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

/** 아래 반쪽 정점을 중심선으로 접어 반토막(반달) — 원형도 폭락 (거미 실패, GDD §8.1 ①) */
function bisectBlob(blob: BlobState): void {
  const cy = blob.cy;
  for (let i = 1; i < blob.verts.length; i += 2) {
    if (blob.verts[i]! > cy) blob.verts[i] = cy;
  }
}

function makeLcg(seed: number): RangeRng {
  let s = seed;
  return (min: number, max: number): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return min + (s % (max - min + 1));
  };
}

/**
 * 코어 플레이 씬 (M2) — M1 스테이지 위에 데이터 주도 방해꾼 이벤트를 얹었다.
 * 제스처: 탭=깨기 · 홀드릴리즈=뒤집기 · 위로 스와이프=서빙 · 드래그=거미줄 절단 · 더블탭=고양이(강도).
 * 이벤트 스폰/해소는 순수 EventScheduler가, 게임 진행은 StageSession이 결정한다.
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
  private stageDef!: StageDef;
  private heatCoeff = 1;
  private scheduler!: EventScheduler;
  private readonly enemyViews = new Map<EventInstance, EnemyView>();
  private items: ItemView[] = [];
  private webTrophies: WebTrophyView[] = [];

  private steam!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private steamAccMs = 0;

  private eggs: EggEntity[] = [];
  private nextEggId = 0;
  private ended = false;
  private smokeFailing = false;

  private charging = false;
  private flipping = false;
  private downAtMs = 0;
  private downPos = { x: 0, y: 0 };
  private lastDownMs = -9999;
  private suppressUp = false;

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

    // 주스: 지글지글 스팀 + 크랙 파티클 (수동 방출)
    this.steam = this.add
      .particles(0, 0, 'steam', {
        lifespan: 1000,
        speedY: { min: -70, max: -40 },
        speedX: { min: -14, max: 14 },
        scale: { start: 0.42, end: 1.15 },
        alpha: { start: 0.4, end: 0 },
        emitting: false,
      })
      .setDepth(DEPTH.egg + 1);
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        lifespan: 520,
        speed: { min: 70, max: 180 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.95, end: 0 },
        gravityY: 440,
        emitting: false,
      })
      .setDepth(DEPTH.egg + 2);

    this.eggs = [];
    this.nextEggId = 0;
    this.ended = false;
    this.charging = false;
    this.flipping = false;
    this.enemyViews.clear();
    this.items = [];
    this.webTrophies = [];

    // 스테이지 로드 — ?stage=id 또는 첫 스테이지 (GDD §10)
    const params = new URLSearchParams(window.location.search);
    this.stageDef = findStage(params.get('stage') ?? '') ?? STAGES[0]!;
    const def = this.stageDef;
    this.heatCoeff = HEAT[def.heatSource].base;
    this.session = StageSession.fromDef(def, ORDER.visibleCount, makeLcg(STAGE_SEED));
    const pool = ENEMIES.filter((e) => def.enemyPool.includes(e.id));
    // QA/디버그: ?events=off 로 방해꾼 스폰 정지 (결과 화면 등 검증용)
    const eventBudget = params.get('events') === 'off' ? 0 : def.eventBudget;
    this.scheduler = new EventScheduler(
      pool,
      eventBudget,
      STAGE1.eventMaxConcurrent,
      makeLcg(EVENT_SEED),
      STAGE1.stageNumber,
      STAGE1.eventSpawnGapMs,
    );
    this.refreshStageUi();
    this.spawnItems(def);

    this.hud = params.get('debug') === '0' ? null : new DebugHud(this);
    // QA/디버그: ?spawn=ninja_spider|back_robber 로 스폰 (?spawnAfter=ms 로 지연 — 계란 준비 후)
    const forced = params.get('spawn');
    if (forced) {
      const delay = Number(params.get('spawnAfter') ?? 0);
      const doSpawn = (): void => {
        if (this.ended) return;
        const inst = this.scheduler.forceSpawn(forced);
        if (inst) this.handleSpawn(inst);
      };
      if (delay > 0) this.time.delayedCall(delay, doSpawn);
      else doSpawn();
    }

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
      for (const it of this.items) it.destroy();
      this.items = [];
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

  /** 스테이지 데이터의 아이템을 벽/선반에 배치 (GDD §9) — 탭 시 onItemTap */
  private spawnItems(def: StageDef): void {
    for (const it of def.items ?? []) {
      const pos = ITEM_POS[it.pos];
      if (!pos || !ITEMS[it.id]) continue;
      this.items.push(
        new ItemView(this, it.id, pos.x * DESIGN.width, pos.y * DESIGN.height, (id) =>
          this.onItemTap(id),
        ),
      );
    }
  }

  /** 아이템 탭 라우팅 — 정답 아이템은 활성 이벤트 해소, decoy는 개그(무해, GDD §9 미스리드) */
  private onItemTap(id: string): void {
    if (this.flipping || this.ended) return;
    const def = ITEMS[id];
    if (!def) return;
    if (def.correctFor === null) {
      this.playItemGag(id); // decoy — 손잡이 빠지는 등 개그, 페널티 없음
      return;
    }
    // 아이템 입력 키 = 아이템 id (lid·torch·fencing_sword)
    const hit = this.scheduler.tryInput(id as InputKey);
    if (hit) this.resolveEvent(hit, 'success');
  }

  /** decoy 개그 — 방패 탭 시 손잡이가 툭 떨어지는 헛수고 연출 (GDD §9) */
  private playItemGag(id: string): void {
    const view = this.items.find((v) => v.id === id);
    if (view) view.gag();
  }

  private liveEggs(): EggEntity[] {
    return this.eggs.filter((e) => !e.lost);
  }

  private hasUnflipped(): boolean {
    return this.eggs.some((e) => !e.flipped && !e.lost && !e.frozen);
  }

  /** 지금 window 중인 이벤트가 요구하는 입력 (없으면 null) */
  private activeWindowInput(): InputKey | null {
    for (const inst of this.scheduler.active) {
      if (inst.phase === 'WINDOW') return inst.def.input;
    }
    return null;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.flipping || this.ended) return;
    const now = this.time.now;
    // 더블탭 — 강도 이벤트 대응
    if (now - this.lastDownMs < DOUBLE_TAP_MS && this.activeWindowInput() === 'double_tap') {
      const hit = this.scheduler.tryInput('double_tap');
      if (hit) this.resolveEvent(hit, 'success');
      this.suppressUp = true;
    }
    this.lastDownMs = now;
    this.downAtMs = now;
    this.downPos = { x: pointer.x, y: pointer.y };
    this.charging = this.hasUnflipped();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.suppressUp) {
      this.suppressUp = false;
      this.charging = false;
      this.gauge.hide();
      return;
    }
    if (this.flipping || this.ended) return;
    const heldMs = this.time.now - this.downAtMs;
    const dx = pointer.x - this.downPos.x;
    const dy = pointer.y - this.downPos.y;
    const drag = Math.hypot(dx, dy);
    this.charging = false;
    this.gauge.hide();

    const windowInput = this.activeWindowInput();

    // 드래그 = 거미줄 절단
    if (drag >= DRAG_CUT_PX && windowInput === 'drag_cut') {
      const hit = this.scheduler.tryInput('drag_cut');
      if (hit) {
        this.resolveEvent(hit, 'success');
        return;
      }
    }
    // 강도 이벤트 중에는 단일 탭을 소비(더블탭 대기) — 깨기로 새지 않게
    if (windowInput === 'double_tap' && heldMs < TAP_MAX_MS && drag < DRAG_CUT_PX) {
      return;
    }
    // 파리 window — 탭으로 격추 (착지 후 똥 전조). 미스여도 탭 소비(깨기로 안 샘)
    if (windowInput === 'tap' && heldMs < TAP_MAX_MS && drag < DRAG_CUT_PX) {
      const hit = this.scheduler.tryInput('tap');
      if (hit) this.resolveEvent(hit, 'success');
      return;
    }

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
    const cap = Math.min(order.eggCount, this.stageDef.panCapacity, DEBUG.MAX_EGGS);
    if (this.liveEggs().length >= cap) return;
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
      frozen: false,
      yolkBroken: false,
      hairPenalty: false,
      flyPenalty: false,
      outcome: null,
      offsetY: 0,
      scaleX: 1,
    });
    bus.emit('egg:cracked', { eggId: id, x, y });
    this.sparks.emitParticleAt(x, y, 7); // 크랙 팝
    this.refreshStageUi();
    this.checkStatus();
  }

  private startFlip(p: number): void {
    const targets = this.eggs.filter((e) => !e.flipped && !e.lost && !e.frozen);
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

  private failOrder(): void {
    this.session.failCurrent();
    for (const e of this.eggs) e.view.destroy();
    this.eggs = [];
    this.refreshStageUi();
    this.checkStatus();
  }

  private serve(): void {
    const ready = this.eggs.filter((e) => (e.flipped || e.frozen) && !e.lost);
    if (ready.length === 0) return;
    const scores: number[] = [];
    for (const e of ready) {
      let score = scoreFromQ(circularity(getPolygon(e.blob)));
      if (e.yolkBroken) score = Math.max(0, score + SCORE.deduction.yolkBurst);
      if (e.hairPenalty) score = Math.max(0, score + SCORE.deduction.hair);
      if (e.flyPenalty) score = Math.max(0, score + SCORE.deduction.flyPoop);
      scores.push(score);
      this.scorePopup.popup(e.blob.cx, e.blob.cy - 40, score);
      e.view.destroy();
    }
    this.eggs = this.eggs.filter((e) => !ready.includes(e));
    this.session.serveCurrent(scores);
    this.refreshStageUi();
    this.checkStatus();
  }

  // ── 이벤트(방해꾼) ──

  private handleSpawn(inst: EventInstance): void {
    const view = this.enemyViewFor(inst);
    if (view) this.enemyViews.set(inst, view);
  }

  private enemyViewFor(inst: EventInstance): EnemyView | null {
    switch (inst.def.id) {
      case 'ninja_spider':
        return new SpiderView(this);
      case 'back_robber':
        return new RobberView(this);
      case 'sneeze_troll':
        return new SneezeView(this);
      case 'hair_troll':
        return new HairView(this);
      case 'fly':
        return new FlyView(this);
      default:
        return null; // 핸들러 없는 적(더미)은 뷰 없음
    }
  }

  private resolveEvent(inst: EventInstance, result: 'success' | 'fail'): void {
    const view = this.enemyViews.get(inst);
    if (!view) return; // 이미 처리됨
    this.enemyViews.delete(inst);
    const keys = result === 'success' ? inst.def.onSuccess : inst.def.onFail;
    for (const k of keys) this.runEffect(k);
    view.playResolve(result, () => view.destroy());
  }

  private runEffect(key: string): void {
    switch (key) {
      case 'egg_bisect': {
        const target = this.liveEggs().find((e) => !e.flipped && !e.frozen) ?? this.liveEggs()[0];
        if (target) {
          bisectBlob(target.blob);
          target.frozen = true; // stepSpread가 반토막을 덮어쓰지 않게 고정
          this.cameras.main.shake(180, 0.012); // 반토막 임팩트
        }
        break;
      }
      case 'yolk_steal': {
        const target = this.liveEggs().find((e) => !e.yolkBroken);
        if (target) target.yolkBroken = true;
        break;
      }
      case 'fx_web_flutter':
        this.webTrophies.push(new WebTrophyView(this, DESIGN.width * SPIDER.hangXRatio));
        break;
      case 'fx_cat_chase':
        new CatView(this);
        break;
      case 'game_over_sneeze':
        // 재채기 침이 팬에 → 즉시 게임 오버 (GDD §8.1 ③, DECISION-01)
        this.triggerSneezeFail();
        break;
      case 'hair_land': {
        // 머리카락 안착 → 대상 계란 −10 (GDD §8.1 ④, DECISION-02)
        const target = this.liveEggs().find((e) => !e.hairPenalty) ?? this.liveEggs()[0];
        if (target) target.hairPenalty = true;
        break;
      }
      case 'fly_poop': {
        // 파리 똥 투하 → 대상 계란 −20 (GDD §8.1 ⑥)
        const target = this.liveEggs().find((e) => !e.flyPenalty) ?? this.liveEggs()[0];
        if (target) target.flyPenalty = true;
        break;
      }
      case 'fx_lid_block':
        this.cameras.main.flash(120, 200, 220, 255); // 뚜껑 챙 — 막음
        break;
      case 'fx_torch_burn':
        this.sparks.emitParticleAt(DESIGN.width * 0.5, DESIGN.height * 0.42, 8);
        break;
      case 'fx_star_kill':
        this.sparks.emitParticleAt(DESIGN.width * 0.5, DESIGN.height * 0.5, 10);
        break;
      // sfx_*, actor_escape, fx_placeholder → 무음 스텁 / playResolve가 처리
      default:
        break;
    }
  }

  /** SMOKE 방치 → 스프링클러 연출 후 실패 (GDD §5) */
  private triggerSmokeFail(): void {
    if (this.ended || this.smokeFailing) return;
    this.smokeFailing = true;
    this.session.forceFail('smoke');
    new SprinklerView(this);
    this.cameras.main.flash(220, 150, 190, 255);
    this.time.delayedCall(1200, () => this.endStage());
  }

  /** 재채기 미차단 → 침이 팬에 → 즉시 게임 오버 (GDD §8.1 ③, DECISION-01) */
  private triggerSneezeFail(): void {
    if (this.ended || this.smokeFailing) return;
    this.smokeFailing = true;
    this.session.forceFail('sneeze');
    this.cameras.main.shake(200, 0.016);
    this.cameras.main.flash(240, 180, 210, 255);
    this.time.delayedCall(900, () => this.endStage());
  }

  private checkStatus(): void {
    if (this.session.status !== 'PLAYING') this.endStage();
  }

  private endStage(): void {
    if (this.ended) return;
    this.ended = true;
    const cleared = this.session.status === 'CLEARED';
    const avg = this.session.averageScore;
    const stars = starsFor(avg, this.stageDef.starThresholds);

    // 진행도 저장 (localStorage, schema version) — 클리어 시에만 최고 기록 갱신
    let best = avg;
    try {
      const storage = window.localStorage as unknown as KVStorage;
      const save = cleared
        ? recordResult(storage, this.stageDef.id, avg, stars, true)
        : recordResult(storage, this.stageDef.id, 0, 0, false);
      best = save.stages[this.stageDef.id]?.bestAverage ?? avg;
    } catch {
      /* localStorage 미지원 환경 무시 */
    }

    this.scene.start('Result', {
      status: this.session.status,
      reason: this.session.failReason,
      stageId: this.stageDef.id,
      average: avg,
      best,
      stars,
      scores: this.session.servedScores.slice(),
      served: this.session.servedScores.length,
      failed: this.session.failedCount,
    });
  }

  override update(_time: number, deltaMs: number): void {
    const dtSec = Math.min(deltaMs / 1000, DEBUG.MAX_DT_SEC);
    const emitSteam = (this.steamAccMs += deltaMs) >= 150;
    if (emitSteam) this.steamAccMs = 0;

    for (const egg of this.eggs) {
      if (!egg.flipped && !egg.lost && !egg.frozen && !this.flipping) {
        stepSpread(egg.blob, dtSec);
        const before = egg.cooking.state;
        const transitions = egg.cooking.update(dtSec, this.heatCoeff);
        let from = before;
        for (const to of transitions) {
          bus.emit('cook:stateChanged', { eggId: egg.id, from, to });
          from = to;
        }
        if (egg.cooking.smokeCriticalFired && !egg.smokeCriticalEmitted) {
          egg.smokeCriticalEmitted = true;
          bus.emit('cook:smokeCritical', { eggId: egg.id });
          this.triggerSmokeFail();
        }
      }
      egg.view.draw(
        egg.blob,
        COOK_STATE_STYLE[egg.cooking.state],
        { offsetY: egg.offsetY, scaleX: egg.scaleX },
        egg.yolkBroken,
      );
      // 지글지글 스팀 — 익는 중(SET~OVERDONE)일 때 위로 피어오른다
      if (emitSteam && !egg.flipped && !egg.lost && !egg.frozen) {
        const s = egg.cooking.state;
        if (s === 'SET' || s === 'PERFECT_WINDOW' || s === 'OVERDONE') {
          this.steam.emitParticleAt(
            egg.blob.cx + (Math.sin(egg.id * 2.3 + this.time.now / 300) * egg.blob.baseRadius) / 2,
            egg.blob.cy - egg.blob.baseRadius * 0.5,
            1,
          );
        }
      }
    }

    // 방해꾼 이벤트 — 조리 중에만 스폰
    if (!this.ended) {
      const cookingActive = this.liveEggs().length > 0;
      const { spawned, resolved } = this.scheduler.update(deltaMs, cookingActive);
      for (const inst of spawned) this.handleSpawn(inst);
      for (const inst of resolved) this.resolveEvent(inst, 'fail');
      for (const inst of this.scheduler.active) this.enemyViews.get(inst)?.update(inst);
    }
    // 아이템 — 매칭 적이 window면 힌트 진동
    const wantItem = this.activeWindowInput();
    for (const it of this.items) {
      it.setHint(it.id === wantItem);
      it.update(deltaMs);
    }
    for (const web of this.webTrophies) web.redraw(this.time.now);

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
