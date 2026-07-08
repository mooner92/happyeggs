import Phaser from 'phaser';
import {
  ANCHORS,
  DEPTH,
  DESIGN,
  PAN_RADIUS_RATIO,
  PAN_SHAPE,
  PERSPECTIVE,
  toPx,
} from '../../data/layout';
import { PALETTE } from '../../data/palette';
import { addSoftShadow } from '../textures';

/**
 * 팬 — 3/4 원근(세로 압축 타원) + 옆벽 깊이 + 접지 그림자 + 조리면 광택 + 왼손 손잡이.
 * 위에서 정면으로 내려다보지 않고 살짝 누운 느낌 (Bacon 톤). 크랙 유효 영역 판정 제공.
 */
export class PanView {
  readonly center: { x: number; y: number };
  readonly radius: number;
  private readonly ry: number;

  constructor(scene: Phaser.Scene) {
    this.center = toPx(ANCHORS.pan);
    this.radius = DESIGN.width * PAN_RADIUS_RATIO;
    this.ry = this.radius * PERSPECTIVE.squashY;

    const { x: cx, y: cy } = this.center;
    const wall = PERSPECTIVE.panWallPx;
    const rimRx = this.radius * PAN_SHAPE.rim;
    const rimRy = this.ry * PAN_SHAPE.rim;

    // 접지 그림자 — 팬 아래 바닥에 부드럽게 (팬보다 뒤)
    addSoftShadow(scene, cx, cy + this.ry * 0.9, rimRx * 2.5, rimRy * 1.7, DEPTH.pan - 1, 0.45);

    const g = scene.add.graphics().setDepth(DEPTH.pan);

    // 손잡이 — 팬 가장자리에서 왼손 앵커로 (원근 압축된 y 사용)
    const hand = toPx(ANCHORS.handLeft);
    g.lineStyle(this.radius * PAN_SHAPE.handleWidth, PALETTE.panRim, 1);
    g.lineBetween(
      cx + this.radius * PAN_SHAPE.handleFrom.x,
      cy + this.ry * PAN_SHAPE.handleFrom.y,
      hand.x,
      hand.y,
    );

    // 옆벽(깊이) — 아래로 offset한 어두운 림 타원이 하단에 립으로 드러난다
    g.fillStyle(PALETTE.panRim, 1);
    g.fillEllipse(cx, cy + wall, rimRx * 2, rimRy * 2);
    // 림 윗면
    g.fillEllipse(cx, cy, rimRx * 2, rimRy * 2);
    // 조리면
    g.fillStyle(PALETTE.pan, 1);
    g.fillEllipse(cx, cy, this.radius * 2, this.ry * 2);
    // 조리면 안쪽 미묘한 명암(가장자리 살짝 밝게)
    g.lineStyle(6, PALETTE.panSheen, 0.35);
    g.strokeEllipse(cx, cy, this.radius * 1.82, this.ry * 1.82);

    // 조리면 광택 — 왼쪽 위에서 오는 빛 (soft-glow 스프라이트)
    scene.add
      .image(cx - this.radius * 0.28, cy - this.ry * 0.42, 'soft-glow')
      .setDisplaySize(this.radius * 1.5, this.ry * 1.1)
      .setAlpha(0.12)
      .setDepth(DEPTH.pan);
  }

  /** (x, y)가 팬 조리면 안인가 — 타원 판정, margin만큼 안쪽으로 좁힌다 */
  containsPoint(x: number, y: number, margin = 0): boolean {
    const rx = this.radius - margin;
    const ry = this.ry - margin * PERSPECTIVE.squashY;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (x - this.center.x) / rx;
    const dy = (y - this.center.y) / ry;
    return dx * dx + dy * dy <= 1;
  }
}
