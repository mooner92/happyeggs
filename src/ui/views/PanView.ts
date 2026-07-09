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
import { PALETTE, SPATULA_STYLE } from '../../data/palette';
import { addSoftShadow } from '../textures';
import { OUTLINE, lighten } from './charKit';

/**
 * 팬 — 3/4 원근(세로 압축 타원) + 옆벽 깊이 + 접지 그림자 + 조리면 광택 + 왼손 손잡이.
 * 위에서 정면으로 내려다보지 않고 살짝 누운 느낌 (Bacon 톤). 크랙 유효 영역 판정 제공.
 * 디자인 v3: 나무 그립(밝은 띠 2개) + 팬-손잡이 연결 리벳 + 은은한 림 외곽선.
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
    const hx0 = cx + this.radius * PAN_SHAPE.handleFrom.x;
    const hy0 = cy + this.ry * PAN_SHAPE.handleFrom.y;
    g.lineStyle(this.radius * PAN_SHAPE.handleWidth, PALETTE.panRim, 1);
    g.lineBetween(hx0, hy0, hand.x, hand.y);
    // 나무 그립 (v3) — 손 쪽 절반을 밝은 나무로 감싼다. 어두운 손잡이가 그립의 외곽선 역할
    const gp = (t: number) => ({ x: hx0 + (hand.x - hx0) * t, y: hy0 + (hand.y - hy0) * t });
    const gripW = this.radius * PAN_SHAPE.handleWidth * 0.82;
    const g0 = gp(0.52);
    g.lineStyle(gripW, SPATULA_STYLE.handle, 1);
    g.lineBetween(g0.x, g0.y, hand.x, hand.y);
    // 그립 결 하이라이트 — 가는 밝은 선
    g.lineStyle(gripW * 0.28, lighten(SPATULA_STYLE.handle, 0.22), 1);
    g.lineBetween(gp(0.55).x, gp(0.55).y, hand.x, hand.y);
    // 밝은 띠 2개 — 그립에 감긴 링 (손잡이 진행 방향의 법선으로 가로지른다)
    const hlen = Math.hypot(hand.x - hx0, hand.y - hy0);
    const nx = -(hand.y - hy0) / hlen;
    const ny = (hand.x - hx0) / hlen;
    g.lineStyle(7, lighten(SPATULA_STYLE.handle, 0.45), 1);
    for (const t of [0.66, 0.8]) {
      const p = gp(t);
      g.lineBetween(p.x - nx * gripW * 0.5, p.y - ny * gripW * 0.5, p.x + nx * gripW * 0.5, p.y + ny * gripW * 0.5);
    }

    // 옆벽(깊이) — 아래로 offset한 어두운 림 타원이 하단에 립으로 드러난다
    g.fillStyle(PALETTE.panRim, 1);
    g.fillEllipse(cx, cy + wall, rimRx * 2, rimRy * 2);
    // 림 윗면
    g.fillEllipse(cx, cy, rimRx * 2, rimRy * 2);
    // 림 외곽선 — 살짝 (v3: 소품 실루엣 정리, 은은하게)
    g.lineStyle(3, OUTLINE.color, 0.6);
    g.strokeEllipse(cx, cy, rimRx * 2, rimRy * 2);
    // 림 상단 하이라이트 — 왼쪽 위 빛을 받는 금속 테 (디자인 v1)
    g.lineStyle(4, PALETTE.panSheen, 0.5);
    g.beginPath();
    g.arc(cx, cy, (rimRx + this.radius) / 2, Math.PI * 0.95, Math.PI * 1.75);
    g.strokePath();

    // 조리면 — 방사 그라데이션 + 브러시드 링 텍스처를 타원으로 눌러서 (디자인 v1)
    scene.add
      .image(cx, cy, 'pan-surface')
      .setDisplaySize(this.radius * 2, this.ry * 2)
      .setDepth(DEPTH.pan);

    // 조리면 광택 — 왼쪽 위에서 오는 빛 (soft-glow 스프라이트)
    scene.add
      .image(cx - this.radius * 0.28, cy - this.ry * 0.42, 'soft-glow')
      .setDisplaySize(this.radius * 1.5, this.ry * 1.1)
      .setAlpha(0.14)
      .setDepth(DEPTH.pan);

    // 팬-손잡이 연결 리벳 (v3) — 조리면 이미지에 가려지지 않게 뒤에 추가한 별도 graphics.
    // 손잡이 선이 림 밴드(반경 ~중앙)와 만나는 지점을 타원 정규화 좌표의 이차방정식으로 구한다
    const g2 = scene.add.graphics().setDepth(DEPTH.pan);
    const k = (1 + PAN_SHAPE.rim) / 2; // 림 밴드 중앙 (반경 비율)
    const ax = (hx0 - cx) / this.radius;
    const ay = (hy0 - cy) / this.ry;
    const dx = (hand.x - hx0) / this.radius;
    const dy = (hand.y - hy0) / this.ry;
    const qa = dx * dx + dy * dy;
    const qb = 2 * (ax * dx + ay * dy);
    const qc = ax * ax + ay * ay - k * k;
    const disc = qb * qb - 4 * qa * qc;
    const t = qa > 0 && disc >= 0 ? (-qb + Math.sqrt(disc)) / (2 * qa) : 0;
    const rvx = hx0 + (hand.x - hx0) * t;
    const rvy = hy0 + (hand.y - hy0) * t;
    g2.fillStyle(lighten(PALETTE.panRim, 0.35), 1);
    g2.fillCircle(rvx, rvy, 8);
    g2.lineStyle(3, OUTLINE.color, 0.8);
    g2.strokeCircle(rvx, rvy, 8);
    g2.fillStyle(0xffffff, 0.5);
    g2.fillCircle(rvx - 2.5, rvy - 2.5, 2.5);
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
