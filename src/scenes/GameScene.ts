import Phaser from 'phaser';
import { DEBUG, EGG, FIRE, FLOW, HEAT, ORDER, SCORE, STAGE1 } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { ITEMS, ITEM_POS } from '../data/items';
import {
  ANCHORS,
  DEPTH,
  DESIGN,
  DOUBLE_TAP_MS,
  DRAG_CUT_PX,
  FLIP_ANIM,
  FONT,
  HINT,
  QUEUE,
  SERVE_SWIPE_PX,
  SPIDER,
  TAP_MAX_MS,
  TEXT,
  toPx,
} from '../data/layout';
import { COOK_STATE_STYLE, HUD_TEXT, NIGHT_STYLE, PALETTE } from '../data/palette';
import { CookingModel } from '../systems/CookingModel';
import type { BlobState } from '../systems/EggBlobModel';
import {
  bulgePoint,
  createBlob,
  getPolygon,
  pushBlob,
  stepDrift,
  stepSpread,
} from '../systems/EggBlobModel';
import type { InputKey } from '../systems/enemyDef';
import type { EventInstance } from '../systems/eventInstance';
import { EventScheduler, type RangeRng } from '../systems/eventScheduler';
import { bus } from '../systems/events';
import { judgeFlip, PowerGauge, type FlipOutcome } from '../systems/flip';
import { coinsForServe, reactionForAverage } from '../systems/economy';
import { circularity, scoreFromQ } from '../systems/scoring';
import { StageSession } from '../systems/stage';
import type { StageDef } from '../systems/stageDef';
import { findStage, STAGES } from '../data/stages';
import { starsFor } from '../systems/stars';
import { addCoins, loadSave, recordResult, type KVStorage } from '../systems/save';
import { findSkin, type SkinDef } from '../data/skins';
import { sfx } from '../ui/audio';
import { DebugHud } from '../ui/DebugHud';
import type { EnemyView } from '../ui/views/EnemyView';
import { CatView, WebTrophyView } from '../ui/views/EventEffects';
import { EggView } from '../ui/views/EggView';
import { FlyView } from '../ui/views/FlyView';
import { HairView } from '../ui/views/HairView';
import { HandsView } from '../ui/views/HandsView';
import { HintView } from '../ui/views/HintView';
import { ItemView } from '../ui/views/ItemView';
import { KitchenView } from '../ui/views/KitchenView';
import { PanView } from '../ui/views/PanView';
import { StoveView } from '../ui/views/StoveView';
import { PowerGaugeView } from '../ui/views/PowerGaugeView';
import { QueueView } from '../ui/views/QueueView';
import { RobberView } from '../ui/views/RobberView';
import { ScorePopupView } from '../ui/views/ScorePopupView';
import { SneezeView } from '../ui/views/SneezeView';
import { SniperView } from '../ui/views/SniperView';
import { SnufferView } from '../ui/views/SnufferView';
import { SpiderView } from '../ui/views/SpiderView';
import { SprinklerView } from '../ui/views/SprinklerView';
import { StageHudView } from '../ui/views/StageHudView';
import { ThiefView } from '../ui/views/ThiefView';

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
  /** 저격수 총알 구멍 수 (GDD §8.1 ⑤) — 개당 −12 */
  bulletHoles: number;
  /** 야간 열 글로우 (M5) — 조리 중인 계란이 열화상에서 밝게 */
  nightGlow: Phaser.GameObjects.Image | null;
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
  private stove!: StoveView;
  private hands!: HandsView;
  private hint!: HintView;
  private hud: DebugHud | null = null;
  private gauge!: PowerGaugeView;
  private scorePopup!: ScorePopupView;
  private queueView!: QueueView;
  private stageHud!: StageHudView;
  /** 동사 힌트 소멸 플래그 — 각 조작을 한 번 성공하면 그 힌트는 끝 */
  private crackedOnce = false;
  private flippedOnce = false;
  private servedOnce = false;
  private pushedOnce = false;
  /** 코인 경제 (ADR-0011) — 지갑(저장 로드) + 이번 스테이지 벌이 */
  private walletCoins = 0;
  private earnedCoins = 0;
  /** 야간 + 불 상태 (M5) — 불 꺼지면 조리 정지, 스토브 탭으로 재점화 */
  private night = false;
  private fireOn = true;
  /** 장착 스킨 (GDD §12) — 저장에서 로드, 계란 렌더 색 오버라이드 */
  private skin: SkinDef | undefined;
  private readonly powerGauge = new PowerGauge();
  private session!: StageSession;
  private stageDef!: StageDef;
  private heatCoeff = 1;
  private scheduler!: EventScheduler;
  private readonly enemyViews = new Map<EventInstance, EnemyView>();
  private items: ItemView[] = [];
  /** 도둑에게 도난당한 아이템 id (해당 이벤트 방어 불가) — GDD §9 도난 연쇄 */
  private readonly stolenItems = new Set<string>();
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

  create(data?: { stageId?: string }): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    // 스테이지 정의 먼저 — 스토브(열원 시각화)가 def를 필요로 한다 (GDD §10)
    // 우선순위: 씬 데이터(NEXT 진행) > URL ?stage= > 첫 스테이지
    const params = new URLSearchParams(window.location.search);
    this.stageDef =
      findStage(data?.stageId ?? '') ?? findStage(params.get('stage') ?? '') ?? STAGES[0]!;
    const def = this.stageDef;

    this.cameras.main.fadeIn(280, 0, 0, 0); // 부드러운 씬 진입 (디자인 v1)
    new KitchenView(this);
    this.pan = new PanView(this);
    this.stove = new StoveView(this, def.heatSource); // 팬 다음 생성 — 불꽃이 림 위로
    this.hands = new HandsView(this);
    // 비네트 — 가장자리 어둡게, 시선을 팬으로 (게임플레이 위, HUD 아래)
    this.add
      .image(DESIGN.width / 2, DESIGN.height / 2, 'vignette')
      .setDisplaySize(DESIGN.width, DESIGN.height)
      .setDepth(DEPTH.gauge - 2);

    // 야간(열화상, M5) — 남색 오버레이 아래는 차갑게, 뜨거운 것(불꽃·조리 계란)만 위에서 밝게
    this.night = def.night === true;
    this.fireOn = true;
    if (this.night) {
      this.add
        .rectangle(
          DESIGN.width / 2,
          DESIGN.height / 2,
          DESIGN.width,
          DESIGN.height,
          NIGHT_STYLE.overlay,
          NIGHT_STYLE.overlayAlpha,
        )
        .setDepth(DEPTH.nightOverlay);
      this.stove.setNight();
    }
    this.gauge = new PowerGaugeView(this);
    this.hint = new HintView(this);
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
    this.smokeFailing = false; // 씬 재시작(RETRY) 시 잔존하면 스모크 실패가 무시된다
    this.charging = false;
    this.flipping = false;
    this.crackedOnce = false;
    this.flippedOnce = false;
    this.servedOnce = false;
    this.pushedOnce = false;
    this.earnedCoins = 0;
    try {
      const save = loadSave(window.localStorage as unknown as KVStorage);
      this.walletCoins = save.coins;
      this.skin = findSkin(save.equippedSkin); // 장착 스킨 → 계란 색 (GDD §12)
    } catch {
      this.walletCoins = 0; // localStorage 미지원 환경
      this.skin = undefined;
    }
    this.enemyViews.clear();
    this.items = [];
    this.stolenItems.clear();
    this.webTrophies = [];

    this.heatCoeff = HEAT[def.heatSource].base;
    this.session = StageSession.fromDef(def, ORDER.visibleCount, makeLcg(STAGE_SEED));
    const pool = ENEMIES.filter((e) => def.enemyPool.includes(e.id));
    // QA/디버그: ?events=off 로 방해꾼 스폰 정지 (결과 화면 등 검증용)
    const eventBudget = params.get('events') === 'off' ? 0 : def.eventBudget;
    // 스테이지 번호 = STAGES 순번(1-base) — 적 stageUnlock 필터 근거 (미등록 스테이지는 1)
    const stageNumber = STAGES.findIndex((s) => s.id === def.id) + 1 || STAGE1.stageNumber;
    this.scheduler = new EventScheduler(
      pool,
      eventBudget,
      STAGE1.eventMaxConcurrent,
      makeLcg(EVENT_SEED),
      stageNumber,
      STAGE1.eventSpawnGapMs,
    );
    this.refreshStageUi();
    this.spawnItems(def);

    this.hud =
      params.get('debug') === '0'
        ? null
        : new DebugHud(this, (id) => {
            const e = this.eggs.find((x) => x.id === id);
            return e && !e.lost ? circularity(getPolygon(e.blob)) : undefined;
          });
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
    // 버튼 칩 배경 (디자인 v1 — 탭 타겟 시각화). 텍스트 좌표는 유지(히트 영역 불변)
    const btnChip = this.add.graphics().setDepth(DEPTH.hud - 1);
    btnChip.fillStyle(0x000000, 0.32);
    btnChip.fillRoundedRect(btnPos.x - 186, btnPos.y - 12, 200, 56, 16);
    btnChip.lineStyle(2, 0xffffff, 0.07);
    btnChip.strokeRoundedRect(btnPos.x - 186, btnPos.y - 12, 200, 56, 16);
    this.add
      .text(btnPos.x, btnPos.y, '결과 ▸', { fontFamily: FONT.ui, fontSize: TEXT.buttonSize, color: HUD_TEXT.normal })
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
    // 절대 손님 번호 — 큐가 줄어도 색·액세서리 정체성 유지 (디자인 v1)
    const processed = this.stageDef.customers - this.session.customersLeft;
    this.queueView.render(this.session.visibleOrders, processed);
    this.stageHud.render(
      this.session.remainingStock,
      this.session.servedScores.length,
      this.session.averageScore,
      this.walletCoins + this.earnedCoins,
    );
    // 왼손의 다음 계란 = 재고 어포던스 (구체화 패스)
    this.hands.setHeldEgg(this.session.remainingStock > 0);
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
    sfx.unlock(); // 첫 제스처에서 오디오 정책 해제 (idempotent, M6)
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
    if (heldMs < TAP_MAX_MS) {
      // 불 꺼짐(M5) — 스토브/팬 근처 탭 = 재점화 (조리 재개가 최우선)
      if (!this.fireOn) {
        const d = Math.hypot(pointer.x - this.pan.center.x, pointer.y - this.pan.center.y);
        if (d < this.pan.radius * FIRE.reigniteRadiusFactor) {
          this.fireOn = true;
          sfx.play('reignite');
          this.stove.setFire(true, false);
          this.sparks.emitParticleAt(this.pan.center.x, this.pan.center.y + this.pan.radius * 0.5, 9);
          return;
        }
      }
      // 흐른 흰자 모으기 우선 (ADR-0012) — 계란 근처 탭이면 밀기, 빈 팬 탭이면 깨기
      if (this.tryPush(pointer.x, pointer.y)) return;
      if (this.pan.containsPoint(pointer.x, pointer.y, EGG.INITIAL_RADIUS)) {
        this.crack(pointer.x, pointer.y);
      }
    }
  }

  /** 뒤집개 밀기 (ADR-0012) — 조리 중인 계란의 가장자리 근처 탭이면 흰자를 중심으로 민다 */
  private tryPush(x: number, y: number): boolean {
    for (const e of this.eggs) {
      if (e.flipped || e.lost || e.frozen) continue;
      const d = Math.hypot(x - e.blob.cx, y - e.blob.cy);
      if (d > e.blob.baseRadius + FLOW.maxOutPx + 26) continue;
      if (pushBlob(e.blob, x, y) > 0) {
        this.pushedOnce = true;
        sfx.play('push');
        this.hands.poke(x, y);
        this.steam.emitParticleAt(x, y, 2); // 칙— 눌린 피드백
        return true;
      }
    }
    return false;
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
      view: new EggView(this, EGG.VERTEX_COUNT, this.skin, this.night ? DEPTH.hot + 1 : DEPTH.egg),
      smokeCriticalEmitted: false,
      flipped: false,
      lost: false,
      frozen: false,
      yolkBroken: false,
      hairPenalty: false,
      flyPenalty: false,
      bulletHoles: 0,
      nightGlow: this.night
        ? this.add.image(x, y, 'soft-glow').setTint(NIGHT_STYLE.hotGlow).setDepth(DEPTH.hot)
        : null,
      outcome: null,
      offsetY: 0,
      scaleX: 1,
    });
    this.crackedOnce = true;
    bus.emit('egg:cracked', { eggId: id, x, y });
    sfx.play('crack');
    this.sparks.emitParticleAt(x, y, 7); // 크랙 팝
    this.shellShards(x, y); // 껍데기 파편 (M6 게임필)
    this.refreshStageUi();
    this.checkStatus();
  }

  /** 껍데기 파편 — 반쪽 2개가 좌우로 튀며 사라진다 (M6, 탭당 1회 할당) */
  private shellShards(x: number, y: number): void {
    for (const dir of [-1, 1]) {
      const g = this.add.graphics().setDepth(DEPTH.egg + 3);
      g.fillStyle(PALETTE.white, 1);
      g.beginPath();
      g.arc(0, 0, 16, Math.PI, 0, false);
      g.closePath();
      g.fillPath();
      g.setPosition(x + dir * 8, y);
      this.tweens.add({
        targets: g,
        x: x + dir * (60 + Math.abs(dir) * 20),
        y: y - 40,
        angle: dir * 140,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  private startFlip(p: number): void {
    const targets = this.eggs.filter((e) => !e.flipped && !e.lost && !e.frozen);
    if (targets.length === 0) return;
    this.flipping = true;
    this.flippedOnce = true;
    sfx.play('flip_whoosh');
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
        sfx.play('land_clean');
        this.cameras.main.shake(50, 0.0016); // 착지 반동 (M6 게임필)
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
        sfx.play('land_fold');
        return false;
      case 'BURNT_FLIP':
        e.lost = true;
        sfx.play('fly_off');
        this.flyOff(e);
        return true;
      case 'PROJECTILE':
        // RAW 뒤집기 = 발사체 → 앞 손님이 아이템 훔쳐 도주 (GDD §9 도난 연쇄)
        e.lost = true;
        sfx.play('fly_off');
        this.flyOff(e);
        this.triggerItemSteal();
        return false;
      case 'FLEW_OFF':
      default:
        e.lost = true;
        sfx.play('fly_off');
        this.flyOff(e);
        return false;
    }
  }

  /** RAW 발사 틈에 도둑이 아이템 하나를 훔쳐 도주 — 훔친 아이템은 방어 불가 (GDD §9) */
  private triggerItemSteal(): void {
    const victim = this.items.find((it) => !this.stolenItems.has(it.id));
    if (!victim) return;
    this.stolenItems.add(victim.id);
    new ThiefView(this, victim.x, victim.y, () => {
      victim.setHint(false);
      victim.destroy();
      this.items = this.items.filter((v) => v !== victim);
    }, () => {
      /* 도주 완료 — 별도 처리 없음 */
    });
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
        e.nightGlow?.destroy();
        this.eggs = this.eggs.filter((x) => x !== e);
      },
    });
  }

  private failOrder(): void {
    this.session.failCurrent();
    for (const e of this.eggs) {
      e.view.destroy();
      e.nightGlow?.destroy();
    }
    this.eggs = [];
    this.refreshStageUi();
    this.checkStatus();
  }

  private serve(): void {
    const ready = this.eggs.filter((e) => (e.flipped || e.frozen) && !e.lost);
    if (ready.length === 0) return;
    this.servedOnce = true;
    const scores: number[] = [];
    for (const e of ready) {
      let score = scoreFromQ(circularity(getPolygon(e.blob)));
      if (e.yolkBroken) score = Math.max(0, score + SCORE.deduction.yolkBurst);
      if (e.hairPenalty) score = Math.max(0, score + SCORE.deduction.hair);
      if (e.flyPenalty) score = Math.max(0, score + SCORE.deduction.flyPoop);
      if (e.bulletHoles > 0)
        score = Math.max(0, score + SCORE.deduction.bulletHole * e.bulletHoles);
      scores.push(score);
      this.scorePopup.popup(e.blob.cx, e.blob.cy - 40, score);
      this.serveFlight(e); // 후라이가 손님에게 날아간다 (M6 게임필)
      e.view.destroy();
      e.nightGlow?.destroy();
    }
    sfx.play('serve');
    this.eggs = this.eggs.filter((e) => !ready.includes(e));

    // 손님 리액션 + 코인(기본급+팁) — GPGP식 1:1 응대 피드백 (ADR-0011)
    const serveAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
    this.queueView.react(reactionForAverage(serveAvg));
    const earned = coinsForServe(scores);
    if (earned > 0) {
      this.earnedCoins += earned;
      sfx.play('coin');
      this.coinPopup(this.pan.center.x, this.pan.center.y - 110, earned);
    }

    this.session.serveCurrent(scores);
    this.refreshStageUi();
    this.checkStatus();
  }

  /** 서빙 비행 — 미니 후라이 고스트가 맨 앞 손님에게 포물선으로 날아간다 (M6, 서빙당 1회 할당) */
  private serveFlight(e: EggEntity): void {
    const g = this.add.graphics().setDepth(DEPTH.queue + 3);
    const r = 26;
    g.fillStyle(this.skin?.whiteTint ?? PALETTE.white, 1);
    g.fillEllipse(0, 0, r * 2, r * 1.3);
    g.fillStyle(this.skin?.yolkFill ?? PALETTE.yolk, 1);
    g.fillEllipse(0, 0, r * 0.8, r * 0.55);
    const from = { x: e.blob.cx, y: e.blob.cy };
    const to = {
      x: DESIGN.width * QUEUE.xRatios[0]!,
      y: DESIGN.height * QUEUE.yRatio + QUEUE.bodyH * 0.2,
    };
    g.setPosition(from.x, from.y);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 460,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const arc = -Math.sin(Math.PI * t) * 180; // 포물선
        g.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t + arc);
        g.setScale(1 - t * 0.55);
      },
      onComplete: () => g.destroy(),
    });
  }

  /** 코인 획득 팝업 — 금색 "+N"이 떠오르며 사라진다 (서빙당 1회, per-frame 아님) */
  private coinPopup(x: number, y: number, n: number): void {
    const t = this.add
      .text(x, y, `+${n}`, {
        fontFamily: FONT.ui,
        fontSize: TEXT.buttonSize,
        color: '#f5c542',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.popup);
    this.tweens.add({
      targets: t,
      y: y - 70,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // ── 이벤트(방해꾼) ──

  private handleSpawn(inst: EventInstance): void {
    sfx.play('telegraph');
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
      case 'sniper':
        return new SniperView(this, () => this.onSniperTrap(inst));
      case 'fire_snuffer':
        return new SnufferView(this);
      default:
        return null; // 핸들러 없는 적(더미)은 뷰 없음
    }
  }

  /** 저격수 레이저 직접 탭 = 함정(증원, DECISION-04). 이어질 크랙 탭을 소비 */
  private onSniperTrap(inst: EventInstance): void {
    const view = this.enemyViews.get(inst);
    if (view instanceof SniperView) view.addBeam();
    this.suppressUp = true;
  }

  private resolveEvent(inst: EventInstance, result: 'success' | 'fail'): void {
    const view = this.enemyViews.get(inst);
    if (!view) return; // 이미 처리됨
    this.enemyViews.delete(inst);
    // 저격수 실패 시 구멍 수 = 증식 수 (직접 탭 함정으로 늘어남)
    const holes = view instanceof SniperView ? view.multiplier : 1;
    sfx.play(result === 'success' ? 'event_success' : 'event_fail');
    const keys = result === 'success' ? inst.def.onSuccess : inst.def.onFail;
    for (const k of keys) this.runEffect(k, holes);
    view.playResolve(result, () => view.destroy());
  }

  private runEffect(key: string, count = 1): void {
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
      case 'fx_parry_reflect':
        // 펜싱칼 패링 반사 (GDD §8.1 ⑤) — 초록 스파크
        this.sparks.emitParticleAt(DESIGN.width * 0.5, DESIGN.height * 0.5, 8);
        break;
      case 'fire_out':
        // 불 끄기 적 성공 (GDD §8.1 ⑦) — 불 꺼짐 + 가짜불 스티커 (조리 정지, 스토브 탭 재점화)
        this.fireOn = false;
        sfx.play('fire_out');
        this.stove.setFire(false, true);
        this.cameras.main.flash(200, 120, 170, 255); // 차가운 플래시
        break;
      case 'bullet_hole': {
        // 저격수 실패 → 대상 후라이에 구멍 count개 (증식 수만큼)
        const target = this.liveEggs().find((e) => !e.flipped && !e.frozen) ?? this.liveEggs()[0];
        if (target) target.bulletHoles += count;
        break;
      }
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
    sfx.play('sprinkler');
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
    sfx.play(cleared ? 'stage_clear' : 'game_over');
    const avg = this.session.averageScore;
    const stars = starsFor(avg, this.stageDef.starThresholds);

    // 진행도 저장 (localStorage, schema version) — 클리어 시에만 최고 기록 갱신.
    // 코인은 클리어 여부와 무관하게 서빙한 만큼 적립 (GPGP식 — 번 돈은 내 돈, ADR-0011)
    let best = avg;
    let coinsTotal = this.walletCoins + this.earnedCoins;
    try {
      const storage = window.localStorage as unknown as KVStorage;
      if (cleared) recordResult(storage, this.stageDef.id, avg, stars, true);
      else recordResult(storage, this.stageDef.id, 0, 0, false);
      const save = addCoins(storage, this.earnedCoins);
      best = save.stages[this.stageDef.id]?.bestAverage ?? avg;
      coinsTotal = save.coins;
    } catch {
      /* localStorage 미지원 환경 무시 */
    }

    // 페이드 아웃 후 결과 화면 (디자인 v1 — 씬 전환 연출)
    const data = {
      status: this.session.status,
      reason: this.session.failReason,
      stageId: this.stageDef.id,
      average: avg,
      best,
      stars,
      scores: this.session.servedScores.slice(),
      served: this.session.servedScores.length,
      failed: this.session.failedCount,
      coinsEarned: this.earnedCoins,
      coinsTotal,
    };
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('Result', data),
    );
  }

  override update(_time: number, deltaMs: number): void {
    const dtSec = Math.min(deltaMs / 1000, DEBUG.MAX_DT_SEC);
    const emitSteam = (this.steamAccMs += deltaMs) >= 150;
    if (emitSteam) this.steamAccMs = 0;

    for (const egg of this.eggs) {
      if (!egg.flipped && !egg.lost && !egg.frozen && !this.flipping) {
        stepSpread(egg.blob, dtSec);
        stepDrift(egg.blob, dtSec); // 흰자가 한쪽으로 흐른다 — 밀어서 모아야 함 (ADR-0012)
        const before = egg.cooking.state;
        // 불 꺼짐(M5) = 유효 열 0 — 조리 정지 (스토브 탭으로 재점화)
        const transitions = egg.cooking.update(dtSec, this.fireOn ? this.heatCoeff : 0);
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
        egg.bulletHoles,
        egg.cooking.doneness,
        !egg.flipped && !egg.lost && !egg.frozen,
      );
      // 야간 열 글로우 (M5) — 조리 중일수록 뜨겁게 빛난다
      if (egg.nightGlow) {
        const heatAlpha =
          !egg.flipped && !egg.lost && !egg.frozen && this.fireOn
            ? Math.min(0.4, 0.14 + egg.cooking.doneness * 0.03)
            : 0.05;
        egg.nightGlow
          .setPosition(egg.blob.cx, egg.blob.cy + egg.offsetY)
          .setDisplaySize(egg.blob.baseRadius * 3.4, egg.blob.baseRadius * 2.4)
          .setAlpha(heatAlpha);
      }
      // 지글지글 스팀 — 익는 중(SET~OVERDONE)일 때 위로 피어오른다 (불 꺼지면 정지)
      if (emitSteam && !egg.flipped && !egg.lost && !egg.frozen && this.fireOn) {
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

    // 스토브 불꽃 플리커 (열원 시각화)
    this.stove.update(this.time.now);

    // 무자막 동사 힌트 — 각 조작 첫 성공까지만 (탭→홀드→스와이프 순서로 자연 유도)
    if (!this.ended && !this.flipping && !this.charging) {
      const hintY = this.pan.center.y - HINT.abovePanPx;
      // 밀기 힌트 — 불룩해진 지점 위 (첫 밀기 성공까지). per-frame 배열 할당 금지 — 루프로
      let bulge: ReturnType<typeof bulgePoint> = null;
      if (!this.pushedOnce) {
        for (const e of this.eggs) {
          if (e.flipped || e.lost || e.frozen) continue;
          bulge = bulgePoint(e.blob, FLOW.hintBulgePx);
          if (bulge) break;
        }
      }
      if (!this.crackedOnce && this.liveEggs().length === 0 && this.session.remainingStock > 0) {
        this.hint.show('crack', this.pan.center.x, this.pan.center.y);
      } else if (bulge) {
        this.hint.show('push', bulge.x, bulge.y);
      } else if (
        !this.flippedOnce &&
        this.eggs.some(
          (e) =>
            !e.flipped &&
            !e.lost &&
            !e.frozen &&
            (e.cooking.state === 'SET' || e.cooking.state === 'PERFECT_WINDOW'),
        )
      ) {
        this.hint.show('flip', this.pan.center.x, hintY);
      } else if (!this.servedOnce && this.eggs.some((e) => (e.flipped || e.frozen) && !e.lost)) {
        this.hint.show('serve', this.pan.center.x, hintY);
      } else {
        this.hint.hide();
      }
      this.hint.update(this.time.now);
    } else {
      this.hint.hide();
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
