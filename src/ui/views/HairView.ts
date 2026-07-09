import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, HAIR } from '../../data/layout';
import { HAIR_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import { OUTLINE, lighten } from './charKit';

/**
 * 머리카락 손님 (GDD §8.1 ④) — 위에서 팬으로 하늘하늘 떨어지는 머리카락.
 * 전조: 천천히 낙하. 윈도우: 팬 바로 위에서 부유(슬로모, 토치 탭으로 공중 소각).
 * 성공: 불타 사라짐. 실패: 팬에 안착 → 해당 계란 −10(씬 처리).
 * 디자인 v3: 머리카락 끝에 작은 리본이 묶여 있다(누군가 정성껏 꾸민 머리카락이 떨어진다는 유머).
 * 소각 성공 시 리본은 타서 사라지고 재가 반짝이며 흩날린다.
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
    // 구불구불한 머리카락 (사인 곡선 폴리라인) — 기존 그대로 유지
    const col = this.burning > 0 ? HAIR_STYLE.burn : HAIR_STYLE.strand;
    g.lineStyle(4, col, 1);
    g.beginPath();
    const seg = 10;
    let tipX = x;
    let tipY = y + HAIR.len / 2;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const py = y - HAIR.len / 2 + HAIR.len * t;
      const px = x + Math.sin(t * Math.PI * 3 + y * 0.05) * 12 * (1 + this.burning);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
      if (i === seg) {
        tipX = px;
        tipY = py;
      }
    }
    g.strokePath();
    // 끝의 작은 리본 (우스꽝) — 불이 절반쯤 붙으면 타서 사라진다
    if (this.burning < 0.5) {
      const rb = 8; // 리본 날개 반폭 (뷰 로컬 표현 상수)
      const ribbonCol = 0xff8fa3;
      g.fillStyle(ribbonCol, 1);
      g.beginPath();
      g.moveTo(tipX, tipY);
      g.lineTo(tipX - rb * 1.7, tipY - rb * 0.95);
      g.lineTo(tipX - rb * 1.5, tipY + rb * 0.95);
      g.closePath();
      g.fillPath();
      g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
      g.strokePath();
      g.beginPath();
      g.moveTo(tipX, tipY);
      g.lineTo(tipX + rb * 1.7, tipY - rb * 0.95);
      g.lineTo(tipX + rb * 1.5, tipY + rb * 0.95);
      g.closePath();
      g.fillPath();
      g.strokePath();
      // 가운데 매듭
      g.fillStyle(lighten(ribbonCol, 0.3), 1);
      g.fillCircle(tipX, tipY, rb * 0.55);
      g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
      g.strokeCircle(tipX, tipY, rb * 0.55);
    }
    if (this.burning > 0) {
      // 불꽃 글로우 (기존)
      g.fillStyle(HAIR_STYLE.burn, 0.8 * (1 - this.burning));
      g.fillCircle(x, y + HAIR.len / 2, 10 + this.burning * 18);
      // 재가 반짝 — 십자 트윙클 + 위로 흩날리는 재 플레이크
      const b = this.burning;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.257 + b * 2.5; // 트윙클을 고르게 퍼뜨리는 각도
        const rad = 12 + b * 34 + i * 3;
        const sx = tipX + Math.cos(a) * rad;
        const sy = tipY + Math.sin(a) * rad * 0.8;
        const s = 3 + ((i * 7) % 3);
        g.lineStyle(2, 0xffd27a, 0.9 * (1 - b));
        g.lineBetween(sx - s, sy, sx + s, sy);
        g.lineBetween(sx, sy - s, sx, sy + s);
        // 재 플레이크 (회색 점) — 반짝임과 함께 위로 떠오른다
        g.fillStyle(0xc9c2b8, 0.7 * (1 - b));
        g.fillCircle((sx + tipX) / 2, sy - b * 26, 2.5);
      }
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
