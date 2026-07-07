import Phaser from 'phaser';
import { DEBUG, EGG } from '../data/balance';
import { COOK_STATE_STYLE, PALETTE } from '../data/palette';
import type { BlobState } from '../systems/EggBlobModel';
import { createBlob, stepSpread } from '../systems/EggBlobModel';
import { bus } from '../systems/events';
import { EggView } from '../ui/views/EggView';
import { HandsView } from '../ui/views/HandsView';
import { PanView } from '../ui/views/PanView';

/** 시드 파생 상수 — 밸런스가 아닌 결정론 편의 값 (같은 순서로 깨면 같은 모양) */
const SEED_BASE = 12345;
const SEED_STEP = 7919;

interface EggEntity {
  readonly id: number;
  readonly blob: BlobState;
  readonly view: EggView;
}

/**
 * 코어 플레이 씬 — M0 오케스트레이터.
 * 게임 규칙은 순수 모델(src/systems/)이 들고, 이 씬은 입력 배선·모델 tick·뷰 갱신만 한다.
 * 익힘 색 변화(커밋 11), 디버그 HUD(커밋 12)가 이어서 배선된다.
 */
export class GameScene extends Phaser.Scene {
  private pan!: PanView;
  private eggs: EggEntity[] = [];
  private nextEggId = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.pan = new PanView(this);
    new HandsView(this);

    this.eggs = [];
    this.nextEggId = 0;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // 블롭이 팬 밖으로 삐져나가지 않게 초기 반경만큼 안쪽만 허용
    if (!this.pan.containsPoint(pointer.x, pointer.y, EGG.INITIAL_RADIUS)) return;
    if (this.eggs.length >= DEBUG.MAX_EGGS) return;

    const id = this.nextEggId++;
    const blob = createBlob(SEED_BASE + id * SEED_STEP, pointer.x, pointer.y);
    const view = new EggView(this, EGG.VERTEX_COUNT);
    this.eggs.push({ id, blob, view });
    bus.emit('egg:cracked', { eggId: id, x: pointer.x, y: pointer.y });
  }

  override update(_time: number, deltaMs: number): void {
    // dt 클램프 — 탭 이탈 복귀 시 거대 dt로 인한 순간 전소 방지 (ADR-0006)
    const dtSec = Math.min(deltaMs / 1000, DEBUG.MAX_DT_SEC);
    for (const egg of this.eggs) {
      stepSpread(egg.blob, dtSec);
      egg.view.draw(egg.blob, COOK_STATE_STYLE.RAW); // 상태별 색은 커밋 11에서 배선
    }
  }
}
