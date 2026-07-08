import Phaser from 'phaser';
import { DEPTH, DESIGN, STAGE_HUD, TEXT } from '../../data/layout';
import { STAGE_HUD_TEXT } from '../../data/palette';
import { drawEggIcon } from './eggIcon';

/**
 * 스테이지 HUD (GDD §4) — 계란 재고(계란 아이콘 ×N)와 서빙 평균 점수. 상단 중앙, 항상 표시.
 * 숫자는 ASCII만 사용(한글 폰트 미탑재 두부 방지, [ADR-0009]·[M0 §12]).
 */
export class StageHudView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly stockText: Phaser.GameObjects.Text;
  private readonly avgText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const y = DESIGN.height * STAGE_HUD.yRatio;
    const cx = DESIGN.width * STAGE_HUD.xRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.hud);
    // 재고 아이콘은 중앙 왼쪽, 텍스트로 개수. 평균은 그 아래.
    this.stockText = scene.add
      .text(cx - 40, y, '×0', { fontFamily: 'monospace', fontSize: TEXT.buttonSize, color: STAGE_HUD_TEXT.normal })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
    this.avgText = scene.add
      .text(cx, y + 40, '', { fontFamily: 'monospace', fontSize: TEXT.hudSize, color: STAGE_HUD_TEXT.normal })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud);
    this.drawIcon(cx);
  }

  private drawIcon(cx: number): void {
    const y = DESIGN.height * STAGE_HUD.yRatio;
    this.g.clear();
    drawEggIcon(this.g, cx - 66, y, STAGE_HUD.eggIconR);
  }

  render(stock: number, servedCount: number, average: number): void {
    this.stockText.setText(`×${stock}`);
    this.stockText.setColor(stock <= 1 ? STAGE_HUD_TEXT.low : STAGE_HUD_TEXT.normal);
    this.avgText.setText(servedCount > 0 ? `avg ${average.toFixed(3)}` : '');
  }

  destroy(): void {
    this.g.destroy();
    this.stockText.destroy();
    this.avgText.destroy();
  }
}
