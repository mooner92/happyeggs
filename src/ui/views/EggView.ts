import Phaser from 'phaser';
import { DEPTH, PERSPECTIVE } from '../../data/layout';
import type { EggStyle } from '../../data/palette';
import { YOLK_STYLE } from '../../data/palette';
import type { BlobState } from '../../systems/EggBlobModel';

/** 블롭 폴리곤 외곽선 두께 (표현 값) */
const EDGE_WIDTH = 3;
/** 노른자 외곽선 두께 (표현 값) */
const YOLK_EDGE_WIDTH = 2;

/**
 * 계란 1개의 렌더 — 블롭 폴리곤 + 노른자 원.
 * per-frame 할당 0: Point 배열을 생성자에서 1회 할당하고 draw에서는 x/y만 mutate한다 (GDD §2).
 * 모델(BlobState)을 읽기만 하며 역참조하지 않는다.
 */
export class EggView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly points: Phaser.Geom.Point[];

  constructor(scene: Phaser.Scene, vertexCount: number) {
    this.g = scene.add.graphics().setDepth(DEPTH.egg);
    this.points = Array.from({ length: vertexCount }, () => new Phaser.Geom.Point());
  }

  draw(blob: BlobState, style: EggStyle): void {
    // 팬과 같은 3/4 원근 — 블롭 중심 기준으로 y를 눌러 팬 위에 눕게 한다
    const sq = PERSPECTIVE.squashY;
    const cy = blob.cy;
    for (let i = 0; i < this.points.length; i++) {
      const py = cy + (blob.verts[i * 2 + 1]! - cy) * sq;
      this.points[i]!.setTo(blob.verts[i * 2]!, py);
    }
    const g = this.g;
    g.clear();
    // 흰자
    g.fillStyle(style.fill, style.alpha);
    g.fillPoints(this.points, true);
    g.lineStyle(EDGE_WIDTH, style.edge, style.edgeAlpha);
    g.strokePoints(this.points, true, true);
    // 노른자 — 흰자보다 살짝 불투명하게, 같은 원근으로 눌린 타원
    const yolkY = cy + (blob.yolk.y - cy) * sq;
    g.fillStyle(YOLK_STYLE.fill, Math.min(1, style.alpha + 0.25));
    g.fillEllipse(blob.yolk.x, yolkY, blob.yolk.r * 2, blob.yolk.r * 2 * sq);
    g.lineStyle(YOLK_EDGE_WIDTH, YOLK_STYLE.edge, style.alpha);
    g.strokeEllipse(blob.yolk.x, yolkY, blob.yolk.r * 2, blob.yolk.r * 2 * sq);
  }

  destroy(): void {
    this.g.destroy();
  }
}
