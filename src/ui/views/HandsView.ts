import Phaser from 'phaser';
import { ANCHORS, DEPTH, HAND_SHAPE, toPx } from '../../data/layout';
import { HAND_STYLE, PALETTE, SPATULA_STYLE } from '../../data/palette';
import { addSoftShadow } from '../textures';

/**
 * 1인칭 양손 — 왼손은 **다음 계란을 쥐고**(재고 어포던스 + "깨기" 유도), 오른손은 뒤집개.
 * 계란은 재고에 따라 setHeldEgg로 갱신(재고 0이면 빈손). 손 도형은 정적 1회 드로우.
 */
export class HandsView {
  private readonly eggG: Phaser.GameObjects.Graphics;
  private readonly left: { x: number; y: number };
  private held = false;

  constructor(scene: Phaser.Scene) {
    this.left = toPx(ANCHORS.handLeft);
    const left = this.left;
    const right = toPx(ANCHORS.handRight);
    const pan = toPx(ANCHORS.pan);
    // 손 접지 그림자
    for (const p of [left, right]) {
      addSoftShadow(scene, p.x, p.y + HAND_SHAPE.h * 0.45, HAND_SHAPE.w * 1.6, HAND_SHAPE.h, DEPTH.hand - 1, 0.4);
    }
    // 쥔 계란 — 주먹보다 먼저 생성(같은 depth) → 주먹이 계란 아래를 가려 "쥔" 모양
    this.eggG = scene.add.graphics().setDepth(DEPTH.hand);

    const g = scene.add.graphics().setDepth(DEPTH.hand);

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

  /** 왼손에 다음 계란 표시 — 재고 있으면 쥐고, 없으면 빈손 */
  setHeldEgg(on: boolean): void {
    if (on === this.held) return;
    this.held = on;
    const g = this.eggG;
    g.clear();
    if (!on) return;
    const x = this.left.x + 8;
    const y = this.left.y - HAND_SHAPE.h * 0.62;
    // 껍데기째 계란 — 흰 타원 + 하이라이트
    g.fillStyle(PALETTE.white, 1);
    g.fillEllipse(x, y, 56, 72);
    g.lineStyle(3, 0xd9ccb4, 1);
    g.strokeEllipse(x, y, 56, 72);
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(x - 12, y - 16, 16, 22);
  }
}
