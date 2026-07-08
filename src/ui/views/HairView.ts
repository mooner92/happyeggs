import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, HAIR } from '../../data/layout';
import { HAIR_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';

/**
 * 머리카락 손님 (GDD §8.1 ④) — 위에서 팬으로 하늘하늘 떨어지는 머리카락.
 * 전조: 천천히 낙하. 윈도우: 팬 바로 위에서 부유(슬로모, 토치 탭으로 공중 소각).
 * 성공: 불타 사라짐. 실패: 팬에 안착 → 해당 계란 −10(씬 처리).
 */
export class HairView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private y = 0;
  private burning = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.x = DESIGN.width * HAIR.xRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    const fromY = DESIGN.height * HAIR.fromYRatio;
    const toY = DESIGN.height * HAIR.toYRatio;
    if (inst.phase === 'TELEGRAPH') {
      this.y = fromY + (toY - fromY) * 0.7 * inst.phaseProgress01;
      this.redraw(-1);
    } else {
      // window: 팬 바로 위에서 살랑살랑
      this.y = fromY + (toY - fromY) * (0.7 + 0.25 * Math.sin(inst.phaseProgress01 * Math.PI * 4));
      this.redraw(1 - inst.phaseProgress01);
    }
  }

  private redraw(barFill: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    g.clear();
    // 구불구불한 머리카락 (사인 곡선 폴리라인)
    const col = this.burning > 0 ? HAIR_STYLE.burn : HAIR_STYLE.strand;
    g.lineStyle(4, col, 1);
    g.beginPath();
    const seg = 10;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const py = y - HAIR.len / 2 + HAIR.len * t;
      const px = x + Math.sin(t * Math.PI * 3 + y * 0.05) * 12 * (1 + this.burning);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
    if (this.burning > 0) {
      g.fillStyle(HAIR_STYLE.burn, 0.8 * (1 - this.burning));
      g.fillCircle(x, y + HAIR.len / 2, 10 + this.burning * 18);
    }
    // 전조 바
    if (barFill >= 0) {
      const barY = y - HAIR.len / 2 - EVENT_BAR.abovePx * 0.5;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    if (result === 'success') {
      // 토치에 공중 소각 — 빨갛게 타 사라짐
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 300,
        onUpdate: (tw) => {
          this.burning = tw.getValue() ?? 0;
          this.redraw(-1);
        },
        onComplete: onDone,
      });
    } else {
      // 팬에 안착 — 스르륵 내려앉고 사라짐(−10은 씬)
      const startY = this.y;
      this.scene.tweens.addCounter({
        from: startY,
        to: DESIGN.height * HAIR.toYRatio,
        duration: 260,
        ease: 'Quad.easeIn',
        onUpdate: (tw) => {
          this.y = tw.getValue() ?? startY;
          this.redraw(-1);
        },
        onComplete: onDone,
      });
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
