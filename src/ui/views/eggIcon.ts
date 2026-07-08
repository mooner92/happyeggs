import Phaser from 'phaser';
import { PALETTE, YOLK_STYLE } from '../../data/palette';

/** 작은 계란 아이콘(흰자 타원 + 노른자) — 말풍선 주문·재고 HUD 공용 */
export function drawEggIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillStyle(PALETTE.white, 1);
  g.fillEllipse(x, y, r * 2.3, r * 1.8);
  g.lineStyle(2, YOLK_STYLE.edge, 0.6);
  g.strokeEllipse(x, y, r * 2.3, r * 1.8);
  g.fillStyle(YOLK_STYLE.fill, 1);
  g.fillCircle(x, y, r * 0.55);
}
