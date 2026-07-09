import Phaser from 'phaser';
import { ANCHORS, DEPTH, DESIGN, EVENT_BAR, SNEEZE, toPx } from '../../data/layout';
import { SNEEZE_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import { OUTLINE, drawBody2Tone, drawCheeks, drawEye, drawOpenSmile, lighten } from './charKit';

/**
 * 재채기 손님 (GDD §8.1 ③) — 대기열 근처에서 팬을 향해 "에취".
 * 전조: 코를 킁킁대며 붉어짐(에... 에...). 윈도우: 침방울 분사(뚜껑 탭으로 차단).
 * 성공: 뒤로 물러남. 실패: 침이 팬에 도달 → 즉시 게임 오버(씬 처리).
 * 디자인 v3: 대기열 손님과 같은 계란 체형(2톤) + 충전될수록 커지고 새빨개지는 코 +
 * 전조 후반 질끈 감는 눈 → 윈도우에서 >< 눈, 침방울은 파랑+하이라이트 원.
 */
export class SneezeView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly y: number;
  private readonly panPos = toPx(ANCHORS.pan);
  private recoil = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.x = DESIGN.width * SNEEZE.xRatio;
    this.y = DESIGN.height * SNEEZE.yRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    const charge = inst.phase === 'TELEGRAPH' ? inst.phaseProgress01 : 1;
    const spraying = inst.phase === 'WINDOW';
    this.redraw(charge, spraying ? inst.phaseProgress01 : -1, spraying);
  }

  private redraw(charge: number, barFillInv: number, spraying: boolean): void {
    const g = this.g;
    const x = this.x + this.recoil;
    const y = this.y;
    const w = SNEEZE.bodyW;
    const h = SNEEZE.bodyH;
    g.clear();
    // 접지 그림자 — 대기열 손님과 동일 문법
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, y + h * 0.5, w * 0.95, h * 0.16);
    // 몸통 — 손님과 같은 계란 체형(2톤 + 외곽선)
    drawBody2Tone(g, x, y, w, h, SNEEZE_STYLE.body);
    drawCheeks(g, x, y + h * 0.04, w * 0.27, 8);
    // 눈 — 평소 drawEye → 전조 후반 질끈 → 윈도우 >< 눈
    const eyeDx = w * 0.18;
    const eyeY = y - h * 0.16;
    if (spraying) {
      // >< 눈 (재채기 작렬)
      g.lineStyle(4, OUTLINE.color, 1);
      g.beginPath();
      g.moveTo(x - eyeDx - 6, eyeY - 6);
      g.lineTo(x - eyeDx + 4, eyeY);
      g.lineTo(x - eyeDx - 6, eyeY + 6);
      g.moveTo(x + eyeDx + 6, eyeY - 6);
      g.lineTo(x + eyeDx - 4, eyeY);
      g.lineTo(x + eyeDx + 6, eyeY + 6);
      g.strokePath();
    } else if (charge > 0.7) {
      // 재채기 직전 찡그림 — 질끈 감은 곡선 눈
      g.lineStyle(4, OUTLINE.color, 1);
      g.beginPath();
      g.arc(x - eyeDx, eyeY + 3, 7, Math.PI * 1.15, Math.PI * 1.85, false);
      g.strokePath();
      g.beginPath();
      g.arc(x + eyeDx, eyeY + 3, 7, Math.PI * 1.15, Math.PI * 1.85, false);
      g.strokePath();
    } else {
      // 시선은 팬 쪽 (오른쪽 아래)
      drawEye(g, x - eyeDx, eyeY, 7, 0.3, 0.25);
      drawEye(g, x + eyeDx, eyeY, 7, 0.3, 0.25);
    }
    // 새빨개지는 코 — 충전될수록 커지고(유지) 창백한 핑크 → 새빨강으로
    const nr = 9 + charge * 6;
    const noseY = y - h * 0.02;
    g.fillStyle(lighten(SNEEZE_STYLE.nose, 0.55 * (1 - charge)), 1);
    g.fillCircle(x, noseY, nr);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeCircle(x, noseY, nr);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(x - nr * 0.32, noseY - nr * 0.32, nr * 0.26);
    // 입 — "에… 에…" 하고 점점 벌어지다 윈도우에 활짝
    drawOpenSmile(g, x, y + h * 0.16, spraying ? 34 : 14 + charge * 16);
    // 침방울 분사 (팬 방향) — 파랑 + 흰 하이라이트 원
    if (spraying) {
      const dirX = this.panPos.x - x;
      const dirY = this.panPos.y - y;
      for (let i = 1; i <= 5; i++) {
        const t = (i / 6) * (1 - barFillInv + 0.35);
        const px = x + dirX * t + Math.sin(i * 2) * 10;
        const py = y + dirY * t;
        const dr = 6 - i * 0.6;
        g.fillStyle(SNEEZE_STYLE.spray, 0.9);
        g.fillCircle(px, py, dr);
        g.lineStyle(2, OUTLINE.color, 0.6);
        g.strokeCircle(px, py, dr);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(px - dr * 0.3, py - dr * 0.35, dr * 0.32);
      }
    }
    // 전조/윈도우 바
    if (barFillInv >= 0) {
      const barY = y - h / 2 - EVENT_BAR.abovePx;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * (1 - barFillInv), EVENT_BAR.h);
    }
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    // 성공: 뚜껑에 막혀 뒤로 움찔 후 퇴장 / 실패: 침 분사 유지(게임 오버는 씬)
    const to = result === 'success' ? -160 : 0;
    this.scene.tweens.addCounter({
      from: 0,
      to,
      duration: 320,
      ease: 'Back.easeIn',
      onUpdate: (tw) => {
        this.recoil = tw.getValue() ?? 0;
        this.redraw(1, -1, result === 'fail');
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
