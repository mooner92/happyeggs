import Phaser from 'phaser';
import { ANCHORS, DEPTH, HAND_SHAPE, toPx } from '../../data/layout';
import { HAND_STYLE, SPATULA_STYLE } from '../../data/palette';

/** 1인칭 양손 placeholder — 왼손(팬 손잡이 쪽) + 오른손(뒤집개). M0는 정적 도형. */
export class HandsView {
  constructor(scene: Phaser.Scene) {
    const g = scene.add.graphics().setDepth(DEPTH.hand);
    const left = toPx(ANCHORS.handLeft);
    const right = toPx(ANCHORS.handRight);
    const pan = toPx(ANCHORS.pan);

    // 오른손 뒤집개 — 손에서 팬 쪽으로 뻗는 손잡이(나무색) + 밝은 금속 날
    const bladeX = right.x + (pan.x - right.x) * HAND_SHAPE.spatulaReach;
    const bladeY = right.y + (pan.y - right.y) * HAND_SHAPE.spatulaReach;
    const bx = bladeX - HAND_SHAPE.bladeW / 2;
    const by = bladeY - HAND_SHAPE.bladeH / 2;
    const radius = HAND_SHAPE.bladeH / 4;
    g.lineStyle(HAND_SHAPE.spatulaW, SPATULA_STYLE.handle, 1);
    g.lineBetween(right.x, right.y, bladeX, bladeY);
    g.fillStyle(SPATULA_STYLE.blade, 1);
    g.fillRoundedRect(bx, by, HAND_SHAPE.bladeW, HAND_SHAPE.bladeH, radius);
    g.lineStyle(HAND_SHAPE.bladeEdge, SPATULA_STYLE.bladeEdge, 1);
    g.strokeRoundedRect(bx, by, HAND_SHAPE.bladeW, HAND_SHAPE.bladeH, radius);

    // 양손 — 타원 주먹 (날 위에 그려 손이 도구를 쥔 것으로 보이게)
    for (const p of [left, right]) {
      g.fillStyle(HAND_STYLE.fill, 1);
      g.fillEllipse(p.x, p.y, HAND_SHAPE.w, HAND_SHAPE.h);
      g.lineStyle(HAND_SHAPE.outline, HAND_STYLE.line, 1);
      g.strokeEllipse(p.x, p.y, HAND_SHAPE.w, HAND_SHAPE.h);
    }
  }
}
