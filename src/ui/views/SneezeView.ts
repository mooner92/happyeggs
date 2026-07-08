import Phaser from 'phaser';
import { ANCHORS, DEPTH, DESIGN, EVENT_BAR, SNEEZE, toPx } from '../../data/layout';
import { SNEEZE_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';

/**
 * 재채기 손님 (GDD §8.1 ③) — 대기열 근처에서 팬을 향해 "에취".
 * 전조: 코를 킁킁대며 붉어짐(에... 에...). 윈도우: 침방울 분사(뚜껑 탭으로 차단).
 * 성공: 뒤로 물러남. 실패: 침이 팬에 도달 → 즉시 게임 오버(씬 처리).
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
    // 몸통
    g.fillStyle(SNEEZE_STYLE.body, 1);
    g.fillEllipse(x, y, w, h);
    // 얼굴
    g.fillStyle(SNEEZE_STYLE.face, 1);
    g.fillCircle(x - w * 0.16, y - h * 0.12, 5);
    g.fillCircle(x + w * 0.16, y - h * 0.12, 5);
    // 붉어지는 코 (충전도)
    g.fillStyle(SNEEZE_STYLE.nose, 0.4 + charge * 0.6);
    g.fillCircle(x, y - h * 0.02, 8 + charge * 4);
    // 침방울 분사 (팬 방향)
    if (spraying) {
      const dirX = this.panPos.x - x;
      const dirY = this.panPos.y - y;
      g.fillStyle(SNEEZE_STYLE.spray, 0.85);
      for (let i = 1; i <= 5; i++) {
        const t = (i / 6) * (1 - barFillInv + 0.35);
        const px = x + dirX * t + Math.sin(i * 2) * 10;
        const py = y + dirY * t;
        g.fillCircle(px, py, 6 - i * 0.6);
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
