import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, ROBBER } from '../../data/layout';
import { ROBBER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';

/**
 * 뒷문 강도 (GDD §8.1 ②) — 화면 우측 뒷문에서 슬금슬금 팬 쪽으로 진입.
 * 전조/윈도우 동안 안으로 기어들어옴. 성공(고양이): 우측으로 도주. 실패: 노른자 훔쳐 도주(씬 처리).
 */
export class RobberView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly y: number;
  private x: number;

  constructor(private readonly scene: Phaser.Scene) {
    this.y = DESIGN.height * ROBBER.yRatio;
    this.x = DESIGN.width * ROBBER.edgeXRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    const from = DESIGN.width * ROBBER.edgeXRatio;
    const to = DESIGN.width * ROBBER.targetXRatio;
    const total =
      inst.phase === 'TELEGRAPH' ? inst.phaseProgress01 * 0.5 : 0.5 + inst.phaseProgress01 * 0.5;
    this.x = from + (to - from) * total;
    this.redraw(inst.phase === 'WINDOW' ? 1 - inst.phaseProgress01 : -1);
  }

  private redraw(barFill: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    const w = ROBBER.bodyW;
    const h = ROBBER.bodyH;
    g.clear();
    // 자루(훔친 물건 담을) 등에
    g.fillStyle(ROBBER_STYLE.bag, 1);
    g.fillCircle(x + w * 0.45, y - h * 0.1, w * 0.28);
    // 몸통(후드)
    g.fillStyle(ROBBER_STYLE.body, 1);
    g.fillEllipse(x, y, w, h);
    g.fillStyle(ROBBER_STYLE.hood, 1);
    g.fillEllipse(x, y - h * 0.28, w * 0.9, h * 0.5);
    // 눈 (후드 그늘 속 흰 점)
    g.fillStyle(ROBBER_STYLE.eye, 1);
    g.fillCircle(x - w * 0.14, y - h * 0.28, 5);
    g.fillCircle(x + w * 0.14, y - h * 0.28, 5);
    // 전조 바
    if (barFill >= 0) {
      const barY = y - h / 2 - EVENT_BAR.abovePx;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  playResolve(_result: 'success' | 'fail', onDone: () => void): void {
    // 성공/실패 모두 우측 뒷문으로 도주 (성공=고양이가 쫓아냄, 실패=노른자 훔쳐 도주)
    this.scene.tweens.addCounter({
      from: this.x,
      to: DESIGN.width + 120,
      duration: 340,
      ease: 'Back.easeIn',
      onUpdate: (tw) => {
        this.x = tw.getValue() ?? this.x;
        this.redraw(-1);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
