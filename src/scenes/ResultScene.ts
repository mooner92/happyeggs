import Phaser from 'phaser';
import { DESIGN, TEXT } from '../data/layout';
import { css, PALETTE } from '../data/palette';

/** M0 스텁 — 씬 배선 검증용. 결과 화면 본편(후라이 배열·카운트업·별점·PNG 공유)은 M3. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.add
      .text(DESIGN.width / 2, DESIGN.height / 2, 'RESULT (M0 stub)\n탭하면 재시작', {
        align: 'center',
        fontSize: TEXT.resultSize,
        color: css(PALETTE.white),
      })
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
