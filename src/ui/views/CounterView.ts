import Phaser from 'phaser';
import { COUNTER_BAND, DEPTH, DESIGN } from '../../data/layout';
import { COUNTER_STYLE } from '../../data/palette';

/** 주방 카운터 placeholder (GDD §4 [주방 카운터]) — 팬이 허공에 뜨지 않도록 바닥을 준다. M0는 정적 도형. */
export class CounterView {
  constructor(scene: Phaser.Scene) {
    const topY = DESIGN.height * COUNTER_BAND.topRatio;
    const g = scene.add.graphics().setDepth(DEPTH.counter);
    g.fillStyle(COUNTER_STYLE.front, 1);
    g.fillRect(0, topY, DESIGN.width, DESIGN.height - topY);
    g.fillStyle(COUNTER_STYLE.lip, 1);
    g.fillRect(0, topY, DESIGN.width, COUNTER_BAND.lipPx);
  }
}
