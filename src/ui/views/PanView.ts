import Phaser from 'phaser';
import { ANCHORS, DEPTH, DESIGN, PAN_RADIUS_RATIO, PAN_SHAPE, toPx } from '../../data/layout';
import { PALETTE } from '../../data/palette';

/** 팬 placeholder — 원판 + 림 + 왼손 방향 손잡이 (도형). 크랙 유효 영역 판정 제공. */
export class PanView {
  readonly center: { x: number; y: number };
  readonly radius: number;

  constructor(scene: Phaser.Scene) {
    this.center = toPx(ANCHORS.pan);
    this.radius = DESIGN.width * PAN_RADIUS_RATIO;

    const g = scene.add.graphics().setDepth(DEPTH.pan);
    // 손잡이 — 팬 가장자리에서 왼손 앵커로
    const hand = toPx(ANCHORS.handLeft);
    g.lineStyle(this.radius * PAN_SHAPE.handleWidth, PALETTE.panRim, 1);
    g.lineBetween(
      this.center.x + this.radius * PAN_SHAPE.handleFrom.x,
      this.center.y + this.radius * PAN_SHAPE.handleFrom.y,
      hand.x,
      hand.y,
    );
    // 림 + 조리면
    g.fillStyle(PALETTE.panRim, 1);
    g.fillCircle(this.center.x, this.center.y, this.radius * PAN_SHAPE.rim);
    g.fillStyle(PALETTE.pan, 1);
    g.fillCircle(this.center.x, this.center.y, this.radius);
  }

  /** (x, y)가 팬 조리면 안인가 — margin만큼 안쪽으로 좁혀 판정 */
  containsPoint(x: number, y: number, margin = 0): boolean {
    return Phaser.Math.Distance.Between(x, y, this.center.x, this.center.y) <= this.radius - margin;
  }
}
