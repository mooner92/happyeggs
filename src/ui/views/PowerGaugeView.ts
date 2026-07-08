import Phaser from 'phaser';
import { FLIP } from '../../data/balance';
import { DEPTH, DESIGN, GAUGE_BAR } from '../../data/layout';
import { GAUGE_STYLE } from '../../data/palette';

/**
 * 왕복 파워 게이지 뷰 (GDD §6.3) — 홀드하는 동안만 표시. 값 0(아래)→1(위).
 * 스윗스팟 구간(balance.FLIP.sweetspot)을 초록으로 강조하고, 현재 값 마커를 그린다.
 */
export class PowerGaugeView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly yTop: number;
  private readonly yBottom: number;
  private readonly w: number;

  constructor(scene: Phaser.Scene) {
    this.x = DESIGN.width * GAUGE_BAR.xRatio;
    this.yTop = DESIGN.height * GAUGE_BAR.yTopRatio;
    this.yBottom = DESIGN.height * GAUGE_BAR.yBottomRatio;
    this.w = GAUGE_BAR.widthPx;
    this.g = scene.add.graphics().setDepth(DEPTH.gauge).setVisible(false);
  }

  private valueToY(v: number): number {
    return this.yBottom - (this.yBottom - this.yTop) * Phaser.Math.Clamp(v, 0, 1);
  }

  show(): void {
    this.g.setVisible(true);
  }

  hide(): void {
    this.g.setVisible(false);
  }

  /** 현재 게이지 값으로 다시 그린다 */
  render(value: number): void {
    const g = this.g;
    const left = this.x - this.w / 2;
    const h = this.yBottom - this.yTop;
    g.clear();
    // 트랙
    g.fillStyle(GAUGE_STYLE.track, 1);
    g.fillRoundedRect(left, this.yTop, this.w, h, this.w / 3);
    // 스윗스팟 구간
    const ssTopY = this.valueToY(FLIP.sweetspot.hi);
    const ssBotY = this.valueToY(FLIP.sweetspot.lo);
    g.fillStyle(GAUGE_STYLE.sweetspot, 0.9);
    g.fillRect(left, ssTopY, this.w, ssBotY - ssTopY);
    // 채움(아래→현재)
    const vy = this.valueToY(value);
    g.fillStyle(GAUGE_STYLE.fill, 0.85);
    g.fillRect(left, vy, this.w, this.yBottom - vy);
    // 마커
    g.fillStyle(GAUGE_STYLE.marker, 1);
    g.fillRect(left - 6, vy - 3, this.w + 12, 6);
    // 테두리
    g.lineStyle(3, GAUGE_STYLE.trackEdge, 1);
    g.strokeRoundedRect(left, this.yTop, this.w, h, this.w / 3);
  }

  destroy(): void {
    this.g.destroy();
  }
}
