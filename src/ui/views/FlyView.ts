import Phaser from 'phaser';
import { ANCHORS, DEPTH, DESIGN, EVENT_BAR, FLY, toPx } from '../../data/layout';
import { FLY_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';

/**
 * 파리 (GDD §8.1 ⑥) — 팬 위를 알짱대다(티배깅, 무적) 착지 후 똥 전조.
 * 전조: 비행(탭 무효). 윈도우: 팬에 착지 + 똥방울 부풀음(탭하면 별 처치).
 * 성공: 별 맞고 격추. 실패: 똥 투하 → −20(씬 처리).
 */
export class FlyView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly panPos = toPx(ANCHORS.pan);
  private x = 0;
  private y = 0;
  private star = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
    this.x = this.panPos.x;
    this.y = this.panPos.y;
  }

  update(inst: EventInstance): void {
    if (inst.phase === 'TELEGRAPH') {
      // 티배깅 — 팬 위를 위아래로 약올리듯 비행 (무적)
      const p = inst.phaseProgress01;
      this.x = this.panPos.x + Math.sin(p * Math.PI * 6) * DESIGN.width * 0.12;
      this.y = this.panPos.y - 70 + Math.abs(Math.sin(p * Math.PI * 8)) * -60;
      this.redraw(-1, 0);
    } else {
      // 착지 + 똥 부풀음
      this.x = DESIGN.width * FLY.landXRatio;
      this.y = DESIGN.height * FLY.landYRatio;
      this.redraw(1 - inst.phaseProgress01, inst.phaseProgress01);
    }
  }

  private redraw(barFill: number, poop: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    const r = FLY.bodyR;
    g.clear();
    // 똥방울 전조 (윈도우 중 부풀음)
    if (poop > 0) {
      g.fillStyle(FLY_STYLE.poop, 0.85);
      g.fillCircle(x, y + r + 6, 3 + poop * 9);
    }
    // 날개
    g.fillStyle(FLY_STYLE.wing, 0.7);
    g.fillEllipse(x - r * 0.7, y - r * 0.5, r * 1.1, r * 0.7);
    g.fillEllipse(x + r * 0.7, y - r * 0.5, r * 1.1, r * 0.7);
    // 몸통
    g.fillStyle(FLY_STYLE.body, 1);
    g.fillEllipse(x, y, r * 1.5, r * 2);
    // 눈
    g.fillStyle(FLY_STYLE.eye, 1);
    g.fillCircle(x - r * 0.35, y - r * 0.7, r * 0.35);
    g.fillCircle(x + r * 0.35, y - r * 0.7, r * 0.35);
    // 별 처치 플래시
    if (this.star > 0) {
      this.drawStar(g, x, y, r * (1 + this.star * 2), FLY_STYLE.star, 0.9 * (1 - this.star));
    }
    // 전조 바
    if (barFill >= 0) {
      const barY = y - r * 2 - EVENT_BAR.abovePx * 0.5;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  private drawStar(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    R: number,
    color: number,
    alpha: number,
  ): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : R * 0.45;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    if (result === 'success') {
      // 별 맞고 격추 — 별 번쩍 후 튕겨나감
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 320,
        onUpdate: (tw) => {
          this.star = tw.getValue() ?? 0;
          this.x += 6;
          this.y -= 5;
          this.redraw(-1, 0);
        },
        onComplete: onDone,
      });
    } else {
      // 똥 투하 후 도주 (−20은 씬)
      const startX = this.x;
      this.scene.tweens.addCounter({
        from: startX,
        to: DESIGN.width + 120,
        duration: 300,
        ease: 'Quad.easeIn',
        onUpdate: (tw) => {
          this.x = tw.getValue() ?? startX;
          this.y -= 3;
          this.redraw(-1, 1);
        },
        onComplete: onDone,
      });
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
