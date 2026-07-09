import Phaser from 'phaser';
import { DEPTH, PERSPECTIVE } from '../../data/layout';
import type { EggStyle } from '../../data/palette';
import { EGG_GLOSS, SNIPER_STYLE, YOLK_STYLE } from '../../data/palette';
import type { BlobState } from '../../systems/EggBlobModel';

/** 블롭 폴리곤 외곽선 두께 (표현 값) */
const EDGE_WIDTH = 3;
/** 노른자 외곽선 두께 (표현 값) */
const YOLK_EDGE_WIDTH = 2;

/** 갈변 링 (디자인 v1) — doneness가 이 값부터 갈변 시작, 끝값에서 최대 */
const BROWN_START = 3.5;
const BROWN_FULL = 9.0;
const BROWN_COLOR = 0xa96f33;

/** 프라잉 버블 — 고정(결정적) 배치: [각도rad, 반경비, 크기px] (디자인 v1) */
const BUBBLES: readonly [number, number, number][] = [
  [0.4, 0.82, 4],
  [1.2, 0.9, 3],
  [2.1, 0.78, 5],
  [2.9, 0.88, 3],
  [3.7, 0.84, 4],
  [4.4, 0.92, 3],
  [5.2, 0.8, 4],
  [5.9, 0.87, 3],
];

/** 뒤집기 애니용 렌더 변형 — 블롭 중심 기준 offsetY(포물선)·scaleX(접힘/스쿼시) */
export interface EggTransform {
  readonly offsetY: number;
  readonly scaleX: number;
}
const IDENTITY: EggTransform = { offsetY: 0, scaleX: 1 };

/**
 * 계란 1개의 렌더 — 접지 그림자 + 블롭 폴리곤(흰자) + 광택 + 노른자(하이라이트).
 * per-frame 할당 0: Point 배열은 생성자에서 1회 할당, draw는 x/y만 mutate (GDD §2).
 * 모델(BlobState)을 읽기만 하며 역참조하지 않는다.
 */
/** 스킨 색 오버라이드 (GDD §12 M5) — 미지정 필드는 기본 팔레트 */
export interface EggSkin {
  readonly yolkFill?: number;
  readonly yolkEdge?: number;
  readonly whiteTint?: number;
}

export class EggView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly points: Phaser.Geom.Point[];

  constructor(
    scene: Phaser.Scene,
    vertexCount: number,
    private readonly skin: EggSkin = {},
    /** 야간(M5) — 계란은 뜨거운 물체이므로 열화상 오버레이 위에서 밝게 렌더 */
    baseDepth: number = DEPTH.egg,
  ) {
    this.shadow = scene.add.image(0, 0, 'soft-shadow').setDepth(baseDepth - 1).setAlpha(0.4);
    this.g = scene.add.graphics().setDepth(baseDepth);
    this.points = Array.from({ length: vertexCount }, () => new Phaser.Geom.Point());
  }

  draw(
    blob: BlobState,
    style: EggStyle,
    transform: EggTransform = IDENTITY,
    yolkBroken = false,
    bulletHoles = 0,
    doneness = 0,
    frying = false,
  ): void {
    const sq = PERSPECTIVE.squashY;
    const cx = blob.cx;
    const cy = blob.cy;
    const { offsetY, scaleX } = transform;
    for (let i = 0; i < this.points.length; i++) {
      const px = cx + (blob.verts[i * 2]! - cx) * scaleX;
      const py = cy + (blob.verts[i * 2 + 1]! - cy) * sq + offsetY;
      this.points[i]!.setTo(px, py);
    }
    const r = blob.baseRadius;

    // 접지 그림자 — 계란이 뜨면(offsetY↑) 작아지고 옅어진다
    const lift = Math.min(1, -offsetY / 160);
    this.shadow
      .setPosition(cx, cy + r * sq * 0.55)
      .setDisplaySize(r * 2.6 * scaleX * (1 - lift * 0.4), r * 1.5 * (1 - lift * 0.4))
      .setAlpha((0.42 - lift * 0.3) * style.alpha + 0.05);

    const g = this.g;
    g.clear();
    // 흰자 — 스킨 whiteTint는 밝은(익은 흰자) 상태에서만 적용, BURNT/SMOKE의 탄 색은 유지(가독성)
    const brightWhite = style.alpha >= 0.9 && (style.fill >> 16) >= 0xc8;
    const whiteFill =
      this.skin.whiteTint !== undefined && brightWhite ? this.skin.whiteTint : style.fill;
    g.fillStyle(whiteFill, style.alpha);
    g.fillPoints(this.points, true);
    g.lineStyle(EDGE_WIDTH, style.edge, style.edgeAlpha);
    g.strokePoints(this.points, true, true);
    // 갈변 링 (디자인 v1) — 익을수록 가장자리가 넓고 진하게 구워진다
    const brown = Phaser.Math.Clamp((doneness - BROWN_START) / (BROWN_FULL - BROWN_START), 0, 1);
    if (brown > 0.02) {
      g.lineStyle(3 + brown * 6, BROWN_COLOR, 0.28 + brown * 0.5);
      g.strokePoints(this.points, true, true);
    }
    // 광택 — 왼쪽 위 부드러운 하이라이트 (RAW~PERFECT일수록 반짝)
    const gloss = Math.max(0, style.alpha - 0.5) * 0.7;
    if (gloss > 0.02) {
      g.fillStyle(EGG_GLOSS, gloss);
      g.fillEllipse(cx - r * 0.34 * scaleX, cy - r * 0.32 * sq + offsetY, r * 0.9 * scaleX, r * 0.5 * sq);
    }
    // 프라잉 버블 (디자인 v1) — 굽는 중 가장자리에 자잘한 기포
    if (frying && doneness > 1.2) {
      const nb = Math.min(BUBBLES.length, Math.floor(doneness * 1.4));
      g.fillStyle(EGG_GLOSS, 0.4);
      for (let i = 0; i < nb; i++) {
        const [a, ratio, size] = BUBBLES[i]!;
        g.fillCircle(
          cx + Math.cos(a) * r * ratio * scaleX,
          cy + Math.sin(a) * r * ratio * sq + offsetY,
          size,
        );
      }
    }
    // 노른자 — 눌린 타원(투톤 그라데이션), 파손 시 어둡게+금
    const yolkX = cx + (blob.yolk.x - cx) * scaleX;
    const yolkY = cy + (blob.yolk.y - cy) * sq + offsetY;
    const yr = blob.yolk.r;
    const yolkAlpha = Math.min(1, style.alpha + 0.25);
    const yolkFill = this.skin.yolkFill ?? YOLK_STYLE.fill; // 스킨 오버라이드 (GDD §12)
    const yolkEdge = this.skin.yolkEdge ?? YOLK_STYLE.edge;
    const yolkOuter = this.skin.yolkEdge ?? 0xe8992b; // 외곽 진한 톤(기본 팔레트)
    g.fillStyle(yolkBroken ? yolkEdge : yolkOuter, yolkAlpha);
    g.fillEllipse(yolkX, yolkY, yr * 2 * scaleX, yr * 2 * sq);
    if (!yolkBroken) {
      g.fillStyle(yolkFill, yolkAlpha); // 중심 밝은 톤
      g.fillEllipse(yolkX, yolkY - yr * 0.08 * sq, yr * 1.6 * scaleX, yr * 1.6 * sq);
    }
    g.lineStyle(YOLK_EDGE_WIDTH, yolkEdge, style.alpha);
    g.strokeEllipse(yolkX, yolkY, yr * 2 * scaleX, yr * 2 * sq);
    if (yolkBroken) {
      g.lineStyle(2, 0x3a2a10, style.alpha);
      g.lineBetween(yolkX - yr * scaleX, yolkY, yolkX + yr * scaleX, yolkY);
    } else {
      // 노른자 하이라이트 (도톰한 광택 점)
      g.fillStyle(YOLK_STYLE.highlight, Math.min(1, style.alpha) * 0.85);
      g.fillEllipse(yolkX - yr * 0.32 * scaleX, yolkY - yr * 0.3 * sq, yr * 0.7 * scaleX, yr * 0.55 * sq);
    }
    // 총알 구멍 (저격수 실패, GDD §8.1 ⑤) — 흰자 위 어두운 구멍, 결정론적 배치
    for (let i = 0; i < bulletHoles; i++) {
      const a = 0.8 + i * 2.4; // 고정 각(무작위 없이 결정론)
      const hx = cx + Math.cos(a) * r * 0.5 * scaleX;
      const hy = cy + Math.sin(a) * r * 0.5 * sq + offsetY;
      g.fillStyle(SNIPER_STYLE.hole, Math.min(1, style.alpha + 0.2));
      g.fillEllipse(hx, hy, r * 0.34 * scaleX, r * 0.34 * sq);
      g.lineStyle(2, 0x000000, style.alpha * 0.6);
      g.strokeEllipse(hx, hy, r * 0.34 * scaleX, r * 0.34 * sq);
    }
  }

  destroy(): void {
    this.shadow.destroy();
    this.g.destroy();
  }
}
