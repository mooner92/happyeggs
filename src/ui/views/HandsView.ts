import Phaser from 'phaser';
import { ANCHORS, HAND_SHAPE, toPx } from '../../data/layout';
import { HAND_STYLE, PALETTE } from '../../data/palette';

/** 1인칭 양손 placeholder — 왼손(팬 손잡이 쪽) + 오른손(뒤집개). M0는 정적 도형. */
export class HandsView {
  constructor(scene: Phaser.Scene) {
    const g = scene.add.graphics();
    const left = toPx(ANCHORS.handLeft);
    const right = toPx(ANCHORS.handRight);
    const pan = toPx(ANCHORS.pan);

    // 오른손 뒤집개 — 손에서 팬 방향으로 막대 + 날
    const bladeX = right.x + (pan.x - right.x) * HAND_SHAPE.spatulaReach;
    const bladeY = right.y + (pan.y - right.y) * HAND_SHAPE.spatulaReach;
    g.lineStyle(HAND_SHAPE.spatulaW, PALETTE.panRim, 1);
    g.lineBetween(right.x, right.y, bladeX, bladeY);
    g.fillStyle(PALETTE.pan, 1);
    g.fillRoundedRect(
      bladeX - HAND_SHAPE.bladeW / 2,
      bladeY - HAND_SHAPE.bladeH / 2,
      HAND_SHAPE.bladeW,
      HAND_SHAPE.bladeH,
      HAND_SHAPE.bladeH / 4,
    );

    // 양손 — 타원 주먹
    for (const p of [left, right]) {
      g.fillStyle(HAND_STYLE.fill, 1);
      g.fillEllipse(p.x, p.y, HAND_SHAPE.w, HAND_SHAPE.h);
      g.lineStyle(HAND_SHAPE.outline, HAND_STYLE.line, 1);
      g.strokeEllipse(p.x, p.y, HAND_SHAPE.w, HAND_SHAPE.h);
    }
  }
}
