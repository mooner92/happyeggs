import Phaser from 'phaser';
import { DEPTH } from '../../data/layout';
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
    for (let i = 0; i < this.points.length; i++) {
      this.points[i]!.setTo(blob.verts[i * 2]!, blob.verts[i * 2 + 1]!);
    }
    const g = this.g;
    g.clear();
    // 흰자
    g.fillStyle(style.fill, style.alpha);
    g.fillPoints(this.points, true);
    g.lineStyle(EDGE_WIDTH, style.edge, style.edgeAlpha);
    g.strokePoints(this.points, true, true);
    // 노른자 — 흰자보다 살짝 불투명하게
    g.fillStyle(YOLK_STYLE.fill, Math.min(1, style.alpha + 0.25));
    g.fillCircle(blob.yolk.x, blob.yolk.y, blob.yolk.r);
    g.lineStyle(YOLK_EDGE_WIDTH, YOLK_STYLE.edge, style.alpha);
    g.strokeCircle(blob.yolk.x, blob.yolk.y, blob.yolk.r);
  }

  destroy(): void {
    this.g.destroy();
  }
}
