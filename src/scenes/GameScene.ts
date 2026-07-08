import Phaser from 'phaser';
import { DEBUG, EGG, HEAT } from '../data/balance';
import { COOK_STATE_STYLE, PALETTE } from '../data/palette';
import { CookingModel } from '../systems/CookingModel';
import type { BlobState } from '../systems/EggBlobModel';
import { createBlob, stepSpread } from '../systems/EggBlobModel';
import { bus } from '../systems/events';
import { DebugHud } from '../ui/DebugHud';
import { CounterView } from '../ui/views/CounterView';
import { EggView } from '../ui/views/EggView';
import { HandsView } from '../ui/views/HandsView';
import { PanView } from '../ui/views/PanView';
import { ANCHORS, TEXT, toPx } from '../data/layout';
import { HUD_TEXT } from '../data/palette';

/** 시드 파생 상수 — 밸런스가 아닌 결정론 편의 값 (같은 순서로 깨면 같은 모양) */
const SEED_BASE = 12345;
const SEED_STEP = 7919;

interface EggEntity {
  readonly id: number;
  readonly blob: BlobState;
  readonly cooking: CookingModel;
  readonly view: EggView;
  smokeCriticalEmitted: boolean;
}

/**
 * 코어 플레이 씬 — M0 오케스트레이터.
 * 게임 규칙은 순수 모델(src/systems/)이 들고, 이 씬은 입력 배선·모델 tick·뷰 갱신·버스 발행만 한다.
 * M0 종단: cook:smokeCritical 발행까지 — 스프링클러 실패 처리·씬 전환은 M3 소관.
 */
export class GameScene extends Phaser.Scene {
  private pan!: PanView;
  private hud: DebugHud | null = null;
  private eggs: EggEntity[] = [];
  private nextEggId = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    new CounterView(this);
    this.pan = new PanView(this);
    new HandsView(this);

    this.eggs = [];
    this.nextEggId = 0;

    // 디버그 HUD — M0 기본 ON, `?debug=0`으로만 끈다
    const debugOff = new URLSearchParams(window.location.search).get('debug') === '0';
    this.hud = debugOff ? null : new DebugHud(this);

    // Result 스텁 진입 — 디버그 버튼 (자연스러운 종료 흐름은 M3)
    const btnPos = toPx(ANCHORS.resultButton);
    this.add
      .text(btnPos.x, btnPos.y, 'RESULT ▸', { fontSize: TEXT.buttonSize, color: HUD_TEXT.normal })
      .setOrigin(1, 0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true })
      .on(
        Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
        (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation(); // 버튼 탭이 계란 깨기로 전파되지 않게
          this.scene.start('Result');
        },
      );

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
      this.hud?.destroy();
      this.hud = null;
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // 블롭이 팬 밖으로 삐져나가지 않게 초기 반경만큼 안쪽만 허용
    if (!this.pan.containsPoint(pointer.x, pointer.y, EGG.INITIAL_RADIUS)) return;
    if (this.eggs.length >= DEBUG.MAX_EGGS) return;

    const id = this.nextEggId++;
    this.eggs.push({
      id,
      blob: createBlob(SEED_BASE + id * SEED_STEP, pointer.x, pointer.y),
      cooking: new CookingModel(),
      view: new EggView(this, EGG.VERTEX_COUNT),
      smokeCriticalEmitted: false,
    });
    bus.emit('egg:cracked', { eggId: id, x: pointer.x, y: pointer.y });
  }

  override update(_time: number, deltaMs: number): void {
    // dt 클램프 — 탭 이탈 복귀 시 거대 dt로 인한 순간 전소 방지 (ADR-0006)
    const dtSec = Math.min(deltaMs / 1000, DEBUG.MAX_DT_SEC);
    for (const egg of this.eggs) {
      stepSpread(egg.blob, dtSec);

      // M0 열원은 가스 고정 — 스테이지별 열원은 M3 스테이지 데이터에서 온다
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

      egg.view.draw(egg.blob, COOK_STATE_STYLE[egg.cooking.state]);
    }

    this.hud?.update(deltaMs, this.eggs, this.game.loop.actualFps);
  }
}
