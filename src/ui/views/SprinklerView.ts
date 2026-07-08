import Phaser from 'phaser';
import { DEPTH, DESIGN } from '../../data/layout';

/**
 * 스프링클러 발동 (GDD §5·§6.2) — SMOKE 방치 시 천장에서 물이 쏟아지는 연출. 자체 애니 후 소멸.
 */
export class SprinklerView {
  constructor(scene: Phaser.Scene) {
    const g = scene.add.graphics().setDepth(DEPTH.popup);
    const cols = 16;
    const draw = (t: number): void => {
      g.clear();
      // 파란 물 오버레이 펄스
      g.fillStyle(0x66aaff, 0.14 * (1 - t * 0.5));
      g.fillRect(0, 0, DESIGN.width, DESIGN.height);
      // 물줄기
      g.lineStyle(5, 0xbfe0ff, 0.85);
      for (let i = 0; i < cols; i++) {
        const x = ((i + 0.5) / cols) * DESIGN.width + Math.sin(i * 1.7) * 10;
        const y0 = -120 + t * DESIGN.height * 1.4 + (i % 3) * 70;
        g.lineBetween(x, y0, x, y0 + 80);
      }
    };
    draw(0);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1100,
      onUpdate: (tw) => draw(tw.getValue() ?? 0),
      onComplete: () => g.destroy(),
    });
  }
}
