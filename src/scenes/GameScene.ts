import Phaser from 'phaser';
import { PALETTE } from '../data/palette';
import { HandsView } from '../ui/views/HandsView';
import { PanView } from '../ui/views/PanView';

/**
 * 코어 플레이 씬 — M0 오케스트레이터.
 * 게임 규칙은 순수 모델(src/systems/)이 들고, 이 씬은 입력 배선·모델 tick·뷰 갱신만 한다.
 * 계란 깨기(커밋 10), 익힘 색 변화(커밋 11), 디버그 HUD(커밋 12)가 순서대로 배선된다.
 */
export class GameScene extends Phaser.Scene {
  private pan!: PanView;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.pan = new PanView(this);
    new HandsView(this);
    void this.pan; // 커밋 10에서 크랙 판정에 사용
  }
}
