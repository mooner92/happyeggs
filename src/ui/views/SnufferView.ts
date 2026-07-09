import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, SNUFFER } from '../../data/layout';
import { SNUFFER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';

/**
 * 불 끄기 적 (GDD §8.1 ⑦, M5 야간) — 소화기를 든 잠입자가 좌측에서 스토브로 접근.
 * 전조: 잠입. 윈도우: 소화기 들어올림(탭 저지 허용). 성공: 움찔하며 도주.
 * 실패: 칙— 분사(불 꺼짐 + 가짜불 스티커는 씬 처리) 후 도주.
 */
export class SnufferView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly y: number;
  private x: number;
  private raise = 0; // 소화기 들어올린 정도 0~1
  private puff = 0; // 분사 연기 진행 0~1

  constructor(private readonly scene: Phaser.Scene) {
    this.y = DESIGN.height * SNUFFER.yRatio;
    this.x = DESIGN.width * SNUFFER.fromXRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    const from = DESIGN.width * SNUFFER.fromXRatio;
    const to = DESIGN.width * SNUFFER.toXRatio;
    if (inst.phase === 'TELEGRAPH') {
      this.x = from + (to - from) * inst.phaseProgress01;
      this.raise = 0;
      this.redraw(-1);
    } else {
      this.x = to;
      this.raise = Math.min(1, inst.phaseProgress01 * 2); // 앞 절반 동안 들어올림
      this.redraw(1 - inst.phaseProgress01);
    }
  }

  private redraw(barFill: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    const w = SNUFFER.bodyW;
    const h = SNUFFER.bodyH;
    g.clear();
    // 몸통(후드 잠입자)
    g.fillStyle(SNUFFER_STYLE.body, 1);
    g.fillEllipse(x, y, w, h);
    g.fillStyle(SNUFFER_STYLE.hood, 1);
    g.fillEllipse(x, y - h * 0.26, w * 0.88, h * 0.5);
    g.fillStyle(SNUFFER_STYLE.eye, 1);
    g.fillCircle(x - w * 0.13, y - h * 0.26, 4);
    g.fillCircle(x + w * 0.13, y - h * 0.26, 4);
    // 소화기 — 빨간 탱크 + 노즐 (raise만큼 스토브 쪽으로 들어올림)
    const tx = x + w * 0.55;
    const ty = y - h * (0.05 + this.raise * 0.3);
    g.fillStyle(SNUFFER_STYLE.tank, 1);
    g.fillRoundedRect(tx - 12, ty - 26, 24, 46, 8);
    g.lineStyle(4, SNUFFER_STYLE.nozzle, 1);
    g.lineBetween(tx, ty - 26, tx + 22 + this.raise * 10, ty - 34 - this.raise * 8);
    // 분사 연기 (실패 연출)
    if (this.puff > 0) {
      g.fillStyle(SNUFFER_STYLE.puff, 0.8 * (1 - this.puff));
      for (let i = 0; i < 4; i++) {
        g.fillCircle(tx + 30 + i * 26 * this.puff, ty - 40 - i * 8 * this.puff, 10 + i * 5);
      }
    }
    // 전조 바
    if (barFill >= 0) {
      const barY = y - h / 2 - EVENT_BAR.abovePx * 0.6;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    if (result === 'fail') {
      // 칙— 분사 후 도주 (불 꺼짐은 씬)
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 340,
        onUpdate: (tw) => {
          this.puff = tw.getValue() ?? 0;
          this.redraw(-1);
        },
        onComplete: () => this.flee(onDone),
      });
    } else {
      this.flee(onDone); // 저지당해 움찔 도주
    }
  }

  private flee(onDone: () => void): void {
    this.scene.tweens.addCounter({
      from: this.x,
      to: -160,
      duration: 320,
      ease: 'Back.easeIn',
      onUpdate: (tw) => {
        this.x = tw.getValue() ?? this.x;
        this.puff = 0;
        this.redraw(-1);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
