import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, SPIDER } from '../../data/layout';
import { SPIDER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';

/**
 * 닌자 거미 (GDD §8.1 ①) — 천장에서 거미줄 타고 하강, 칼을 든 채 팬 위에서 위협.
 * 전조: 내려온다. 윈도우: 위협(전조 바 표시). 성공: 거미줄 절단→낙하. 실패: 위로 후퇴.
 */
export class SpiderView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private y = 0;
  private falling = false;
  private fallY = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.x = DESIGN.width * SPIDER.hangXRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    if (this.falling) {
      this.redraw(this.fallY, false, 0);
      return;
    }
    const telY = DESIGN.height * SPIDER.telegraphYRatio;
    const winY = DESIGN.height * SPIDER.windowYRatio;
    if (inst.phase === 'TELEGRAPH') {
      this.y = telY * inst.phaseProgress01;
      this.redraw(this.y, false, 0);
    } else {
      // window: 팬 위에서 살짝 흔들며 위협
      this.y = winY + Math.sin(inst.phaseProgress01 * Math.PI * 6) * 6;
      this.redraw(this.y, true, 1 - inst.phaseProgress01);
    }
  }

  private redraw(bodyY: number, threat: boolean, barFill: number): void {
    const g = this.g;
    const x = this.x;
    const r = SPIDER.bodyR;
    g.clear();
    // 거미줄 (천장→몸통)
    g.lineStyle(3, SPIDER_STYLE.thread, 0.9);
    g.lineBetween(x, 0, x, bodyY - r);
    // 다리 8개
    g.lineStyle(4, SPIDER_STYLE.leg, 1);
    for (let i = 0; i < 4; i++) {
      const dy = -0.4 + i * 0.28;
      g.lineBetween(x - r * 0.6, bodyY + dy * r, x - r - SPIDER.legLen, bodyY + dy * r - 8);
      g.lineBetween(x + r * 0.6, bodyY + dy * r, x + r + SPIDER.legLen, bodyY + dy * r - 8);
    }
    // 몸통
    g.fillStyle(SPIDER_STYLE.body, 1);
    g.fillCircle(x, bodyY, r);
    g.lineStyle(3, SPIDER_STYLE.bodyEdge, 1);
    g.strokeCircle(x, bodyY, r);
    // 눈(위협 시 붉게)
    g.fillStyle(SPIDER_STYLE.eye, 1);
    g.fillCircle(x - 9, bodyY - 4, 5);
    g.fillCircle(x + 9, bodyY - 4, 5);
    // 칼
    g.fillStyle(SPIDER_STYLE.knife, 1);
    g.fillTriangle(x + r, bodyY, x + r + 30, bodyY - 6, x + r + 30, bodyY + 6);
    // 전조 바 (윈도우 중 남은 시간)
    if (threat) {
      const barY = bodyY - r - EVENT_BAR.abovePx;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    // 성공: 거미줄 절단→아래로 낙하 / 실패: 위로 후퇴 (반토막 이펙트는 씬)
    this.falling = true;
    this.fallY = this.y;
    const to = result === 'success' ? DESIGN.height + 120 : -120;
    this.scene.tweens.addCounter({
      from: this.y,
      to,
      duration: result === 'success' ? 380 : 300,
      ease: 'Cubic.easeIn',
      onUpdate: (tw) => {
        this.fallY = tw.getValue() ?? this.y;
        this.redraw(this.fallY, false, 0);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
