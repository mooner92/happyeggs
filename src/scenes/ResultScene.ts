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
      // M0 placeholder는 ASCII만 — 기기 한글 폰트에 의존하면 미탑재 시 두부(□)로 깨진다.
      // 한글 UI 폰트 번들링은 폴리시(M6)·GDD §14 아트 파이프라인 소관. GDD §15 "UI 텍스트 최소화"도 지지.
      .text(DESIGN.width / 2, DESIGN.height / 2, 'RESULT (M0 stub)\ntap to restart', {
        align: 'center',
        fontSize: TEXT.resultSize,
        color: css(PALETTE.white),
      })
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
