import Phaser from 'phaser';
import { DEPTH, TEXT } from '../../data/layout';
import { SCORE_TEXT } from '../../data/palette';
import { formatScore } from '../../systems/scoring';

/** 서빙 직후 원형도 점수(소수점 3자리)를 팝업으로 띄운다 (GDD §5·§6.4). */
export class ScorePopupView {
  constructor(private readonly scene: Phaser.Scene) {}

  /** (x, y)에 점수를 띄우고 위로 떠오르며 사라진다. good/bad로 색 구분 */
  popup(x: number, y: number, score: number): void {
    const color =
      score >= 90 ? SCORE_TEXT.good : score >= 70 ? SCORE_TEXT.normal : SCORE_TEXT.bad;
    const label = this.scene.add
      .text(x, y, formatScore(score), {
        fontFamily: 'monospace',
        fontSize: TEXT.resultSize,
        color,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.popup);
    this.scene.tweens.add({
      targets: label,
      y: y - 120,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
