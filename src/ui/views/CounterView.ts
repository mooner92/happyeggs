import Phaser from 'phaser';
import { COUNTER_BAND, DEPTH, DESIGN } from '../../data/layout';
import { COUNTER_STYLE, WALL_GRADIENT } from '../../data/palette';

/**
 * 주방 배경 — 벽 그라데이션 + 나무 카운터(윗면 하이라이트 + 앞면) (GDD §4). 정적 도형 + 그라데이션.
 */
export class CounterView {
  constructor(scene: Phaser.Scene) {
    const topY = DESIGN.height * COUNTER_BAND.topRatio;
    const g = scene.add.graphics().setDepth(DEPTH.counter);

    // 벽 — 위→아래 그라데이션 (은은한 명암으로 공간감)
    g.fillGradientStyle(
      WALL_GRADIENT.top,
      WALL_GRADIENT.top,
      WALL_GRADIENT.bottom,
      WALL_GRADIENT.bottom,
      1,
    );
    g.fillRect(0, 0, DESIGN.width, topY);

    // 카운터 앞면
    g.fillStyle(COUNTER_STYLE.front, 1);
    g.fillRect(0, topY, DESIGN.width, DESIGN.height - topY);
    // 카운터 윗면(밝은 나무) — 비스듬한 상판 느낌
    g.fillStyle(COUNTER_STYLE.top, 1);
    g.fillRect(0, topY, DESIGN.width, COUNTER_BAND.lipPx * 2.4);
    // 윗면 하이라이트 라인
    g.fillStyle(COUNTER_STYLE.lip, 1);
    g.fillRect(0, topY, DESIGN.width, 4);
  }
}
