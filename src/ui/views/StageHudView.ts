import Phaser from 'phaser';
import { COIN_HUD, DEPTH, DESIGN, FONT, STAGE_HUD, TEXT } from '../../data/layout';
import { COIN_STYLE, STAGE_HUD_TEXT, css } from '../../data/palette';
import { drawEggIcon } from './eggIcon';

/**
 * 스테이지 HUD (GDD §4) — 계란 재고(계란 아이콘 ×N)·코인 지갑·서빙 평균. 상단 중앙, 항상 표시.
 * 텍스트는 한글 + Jua 폰트 (디자인 v2 — × 글리프 포함 서브셋 self-host).
 */
export class StageHudView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly stockText: Phaser.GameObjects.Text;
  private readonly coinText: Phaser.GameObjects.Text;
  private readonly avgText: Phaser.GameObjects.Text;
  private lastWithAvg = false;

  constructor(scene: Phaser.Scene) {
    const y = DESIGN.height * STAGE_HUD.yRatio;
    const cx = DESIGN.width * STAGE_HUD.xRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.hud);
    // 재고 아이콘은 중앙 왼쪽, 텍스트로 개수. 코인은 오른쪽. 평균은 그 아래.
    this.stockText = scene.add
      .text(cx - 40, y, '×0', { fontFamily: FONT.ui, fontSize: TEXT.buttonSize, color: STAGE_HUD_TEXT.normal })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
    this.coinText = scene.add
      .text(cx + COIN_HUD.dxFromCenter + COIN_HUD.iconR + 8, y, '0', {
        fontFamily: FONT.ui,
        fontSize: TEXT.buttonSize,
        color: css(COIN_STYLE.fill),
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
    this.avgText = scene.add
      .text(cx, y + 40, '', { fontFamily: FONT.ui, fontSize: TEXT.hudSize, color: STAGE_HUD_TEXT.normal })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.hud);
    this.drawIcons(cx, y);
  }

  private drawIcons(cx: number, y: number, withAvg = false): void {
    this.g.clear();
    // HUD 칩 배경 (디자인 v1) — 반투명 라운드 바 (평균 표시 시 2줄 높이)
    const chipW = 340;
    const chipH = withAvg ? 96 : 62;
    this.g.fillStyle(0x4a3524, 0.9);
    this.g.fillRoundedRect(cx - chipW / 2, y - 31, chipW, chipH, 22);
    this.g.lineStyle(2, 0xffffff, 0.06);
    this.g.strokeRoundedRect(cx - chipW / 2, y - 31, chipW, chipH, 22);
    drawEggIcon(this.g, cx - 66, y, STAGE_HUD.eggIconR);
    // 코인 아이콘 — 금화 (원 + 테두리 + 광점)
    const coinX = cx + COIN_HUD.dxFromCenter;
    this.g.fillStyle(COIN_STYLE.fill, 1);
    this.g.fillCircle(coinX, y, COIN_HUD.iconR);
    this.g.lineStyle(3, COIN_STYLE.edge, 1);
    this.g.strokeCircle(coinX, y, COIN_HUD.iconR);
    this.g.fillStyle(COIN_STYLE.shine, 0.9);
    this.g.fillCircle(coinX - COIN_HUD.iconR * 0.3, y - COIN_HUD.iconR * 0.3, COIN_HUD.iconR * 0.28);
  }

  render(stock: number, servedCount: number, average: number, coins = 0): void {
    this.stockText.setText(`×${stock}`);
    this.stockText.setColor(stock <= 1 ? STAGE_HUD_TEXT.low : STAGE_HUD_TEXT.normal);
    this.coinText.setText(`${coins}`);
    const withAvg = servedCount > 0;
    this.avgText.setText(withAvg ? `평균 ${average.toFixed(3)}` : '');
    if (withAvg !== this.lastWithAvg) {
      this.lastWithAvg = withAvg;
      this.drawIcons(DESIGN.width * STAGE_HUD.xRatio, DESIGN.height * STAGE_HUD.yRatio, withAvg);
    }
  }

  destroy(): void {
    this.g.destroy();
    this.stockText.destroy();
    this.coinText.destroy();
    this.avgText.destroy();
  }
}
