import Phaser from 'phaser';
import { DEPTH, PERSPECTIVE } from '../../data/layout';
import type { EggStyle } from '../../data/palette';
import { EGG_GLOSS, SNIPER_STYLE, YOLK_STYLE } from '../../data/palette';
import type { BlobState } from '../../systems/EggBlobModel';

/** 블롭 폴리곤 외곽선 두께 (표현 값) */
const EDGE_WIDTH = 3;
/** 노른자 외곽선 두께 (표현 값) */
const YOLK_EDGE_WIDTH = 2;

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
export class EggView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly points: Phaser.Geom.Point[];

  constructor(scene: Phaser.Scene, vertexCount: number) {
    this.shadow = scene.add.image(0, 0, 'soft-shadow').setDepth(DEPTH.egg - 1).setAlpha(0.4);
    this.g = scene.add.graphics().setDepth(DEPTH.egg);
    this.points = Array.from({ length: vertexCount }, () => new Phaser.Geom.Point());
  }

  draw(
    blob: BlobState,
    style: EggStyle,
    transform: EggTransform = IDENTITY,
    yolkBroken = false,
    bulletHoles = 0,
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
    // 흰자
    g.fillStyle(style.fill, style.alpha);
    g.fillPoints(this.points, true);
    g.lineStyle(EDGE_WIDTH, style.edge, style.edgeAlpha);
    g.strokePoints(this.points, true, true);
    // 광택 — 왼쪽 위 부드러운 하이라이트 (RAW~PERFECT일수록 반짝)
    const gloss = Math.max(0, style.alpha - 0.5) * 0.7;
    if (gloss > 0.02) {
      g.fillStyle(EGG_GLOSS, gloss);
      g.fillEllipse(cx - r * 0.34 * scaleX, cy - r * 0.32 * sq + offsetY, r * 0.9 * scaleX, r * 0.5 * sq);
    }
    // 노른자 — 눌린 타원, 파손 시 어둡게+금
    const yolkX = cx + (blob.yolk.x - cx) * scaleX;
    const yolkY = cy + (blob.yolk.y - cy) * sq + offsetY;
    const yr = blob.yolk.r;
    g.fillStyle(yolkBroken ? YOLK_STYLE.edge : YOLK_STYLE.fill, Math.min(1, style.alpha + 0.25));
    g.fillEllipse(yolkX, yolkY, yr * 2 * scaleX, yr * 2 * sq);
    g.lineStyle(YOLK_EDGE_WIDTH, YOLK_STYLE.edge, style.alpha);
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
