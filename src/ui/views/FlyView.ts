import Phaser from 'phaser';
import { ANCHORS, DEPTH, DESIGN, EVENT_BAR, FLY, toPx } from '../../data/layout';
import { FLY_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import { OUTLINE, drawBody2Tone, drawCheeks, drawEye, drawOpenSmile, lighten } from './charKit';

/**
 * 파리 (GDD §8.1 ⑥) — 팬 위를 알짱대다(티배깅, 무적) 착지 후 똥 전조.
 * 전조: 비행(탭 무효). 윈도우: 팬에 착지 + 똥방울 부풀음(탭하면 별 처치).
 * 성공: 별 맞고 격추. 실패: 똥 투하 → −20(씬 처리).
 * 디자인 v3: 2톤 몸통 + 몸에 비해 터무니없이 큰 사시 왕눈(흰자+검은 동공),
 * 티배깅 중 혀 내민 약올림 입, 똥방울에도 점 2개짜리 얼굴(장난).
 */
export class FlyView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly panPos = toPx(ANCHORS.pan);
  private x = 0;
  private y = 0;
  private star = 0;
  /** 약올림(메롱) 표정 여부 — 티배깅/도주 중 true */
  private taunt = true;

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
      this.taunt = true;
      this.redraw(-1, 0);
    } else {
      // 착지 + 똥 부풀음
      this.x = DESIGN.width * FLY.landXRatio;
      this.y = DESIGN.height * FLY.landYRatio;
      this.taunt = false;
      this.redraw(1 - inst.phaseProgress01, inst.phaseProgress01);
    }
  }

  private redraw(barFill: number, poop: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    const r = FLY.bodyR;
    g.clear();
    // 똥방울 전조 (윈도우 중 부풀음) — 얼굴 점 2개를 붙여 똥도 캐릭터로 (장난)
    if (poop > 0) {
      const pr = 3 + poop * 9;
      const py = y + r + 6;
      g.fillStyle(FLY_STYLE.poop, 1);
      g.fillCircle(x, py, pr);
      g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
      g.strokeCircle(x, py, pr);
      if (pr >= 6) {
        g.fillStyle(OUTLINE.color, 1);
        g.fillCircle(x - pr * 0.32, py - pr * 0.1, pr * 0.13);
        g.fillCircle(x + pr * 0.32, py - pr * 0.1, pr * 0.13);
      }
    }
    // 날개 — 붕붕 펄럭임 (시간 기반 순수 표현 — 로직·타이밍 불변)
    const flap = 0.5 + 0.5 * Math.abs(Math.sin(this.scene.time.now * 0.045));
    const wy = y - r * 0.85 - flap * r * 0.2;
    const ww = r * 1.45;
    const wh = r * (0.5 + flap * 0.5);
    g.fillStyle(FLY_STYLE.wing, 0.8);
    g.fillEllipse(x - r * 0.95, wy, ww, wh);
    g.fillEllipse(x + r * 0.95, wy, ww, wh);
    g.lineStyle(3, OUTLINE.color, 0.6);
    g.strokeEllipse(x - r * 0.95, wy, ww, wh);
    g.strokeEllipse(x + r * 0.95, wy, ww, wh);
    // 더듬이 — 끝에 방울이 달린 삐죽 더듬이
    g.lineStyle(3, OUTLINE.color, 1);
    g.lineBetween(x - r * 0.3, y - r * 0.9, x - r * 0.7, y - r * 1.6);
    g.lineBetween(x + r * 0.3, y - r * 0.9, x + r * 0.7, y - r * 1.6);
    g.fillStyle(lighten(FLY_STYLE.body, 0.35), 1);
    g.fillCircle(x - r * 0.7, y - r * 1.6, 3);
    g.fillCircle(x + r * 0.7, y - r * 1.6, 3);
    // 몸통 — 2톤 + 외곽선
    drawBody2Tone(g, x, y, r * 1.9, r * 2.3, FLY_STYLE.body);
    // 왕눈 2개 — 흰자+검은 동공+글린트, 서로 안쪽을 보는 사시 (유머)
    drawEye(g, x - r * 0.52, y - r * 0.5, r * 0.5, 0.35, 0.2);
    drawEye(g, x + r * 0.52, y - r * 0.5, r * 0.5, -0.35, 0.2);
    drawCheeks(g, x, y + r * 0.12, r * 0.8, 3.5);
    // 입 — 티배깅 중엔 혀를 길게 내밀고 약올린다
    const my = y + r * 0.55;
    if (this.star > 0) {
      // 별 맞고 얼얼 — 동그란 놀란 입
      g.fillStyle(0x5c3226, 1);
      g.fillCircle(x, my, r * 0.26);
      g.lineStyle(3, OUTLINE.color, 1);
      g.strokeCircle(x, my, r * 0.26);
    } else if (this.taunt) {
      drawOpenSmile(g, x, my - 2, r * 0.85);
      // 길게 내민 혀 (메롱) — 턱 아래로 삐져나온다
      g.fillStyle(0xff8a7a, 1);
      g.fillEllipse(x, my + r * 0.45, r * 0.55, r * 0.9);
      g.lineStyle(3, OUTLINE.color, 1);
      g.strokeEllipse(x, my + r * 0.45, r * 0.55, r * 0.9);
      g.lineStyle(2, OUTLINE.color, 0.5);
      g.lineBetween(x, my + r * 0.15, x, my + r * 0.75);
    } else {
      drawOpenSmile(g, x, my, r * 0.6);
    }
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
    // 별에도 킷 외곽선
    g.lineStyle(3, OUTLINE.color, alpha);
    g.strokePath();
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    if (result === 'success') {
      // 별 맞고 격추 — 별 번쩍 후 튕겨나감 (놀란 입)
      this.taunt = false;
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
      // 똥 투하 후 도주 (−20은 씬) — 끝까지 메롱하며 도망간다
      this.taunt = true;
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
