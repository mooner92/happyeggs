import Phaser from 'phaser';
import type { HeatSourceId } from '../../data/balance';
import {
  ANCHORS,
  DEPTH,
  DESIGN,
  PAN_RADIUS_RATIO,
  PAN_SHAPE,
  PERSPECTIVE,
  STOVE,
  toPx,
} from '../../data/layout';
import { STOVE_STYLE } from '../../data/palette';

/**
 * 스토브 (구체화 패스, GDD §6.2) — 열원 계수를 눈에 보이게.
 * 팬 하단 림을 따라 gas=파란 불꽃 링 / brazier=벌건 숯+잉걸 / 그 외=붉은 글로우.
 * 불꽃은 사인 플리커로 매 프레임 재드로우(도형 ~10개 — 예산 내).
 */
export class StoveView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly cx: number;
  private readonly cy: number;
  private readonly rimRx: number;
  private readonly rimRy: number;

  constructor(
    scene: Phaser.Scene,
    private readonly heat: HeatSourceId,
  ) {
    const pan = toPx(ANCHORS.pan);
    this.cx = pan.x;
    this.cy = pan.y;
    const radius = DESIGN.width * PAN_RADIUS_RATIO;
    this.rimRx = radius * PAN_SHAPE.rim * STOVE.ringRatio;
    this.rimRy = radius * PERSPECTIVE.squashY * PAN_SHAPE.rim * STOVE.ringRatio;

    // 버너 베이스 — 팬 밑 어두운 받침 (정적, 팬보다 뒤)
    const base = scene.add.graphics().setDepth(DEPTH.pan - 1);
    base.fillStyle(STOVE_STYLE.base, 1);
    base.fillEllipse(this.cx, this.cy + this.rimRy * 0.42, this.rimRx * 2.3, this.rimRy * 2.1);
    base.lineStyle(3, STOVE_STYLE.baseEdge, 0.8);
    base.strokeEllipse(this.cx, this.cy + this.rimRy * 0.42, this.rimRx * 2.3, this.rimRy * 2.1);

    // 열기 글로우 — 열원색 소프트 글로우 (정적)
    const glowColor = heat === 'gas' ? STOVE_STYLE.gasFlame : STOVE_STYLE.emberGlow;
    scene.add
      .image(this.cx, this.cy + this.rimRy * 0.7, 'soft-glow')
      .setDisplaySize(this.rimRx * 2.2, this.rimRy * 1.6)
      .setTint(glowColor)
      .setAlpha(heat === 'gas' ? 0.16 : 0.24)
      .setDepth(DEPTH.pan - 1);

    // 불꽃/숯 — 팬과 같은 depth에 팬 이후 생성 → 하단 림 위로 그려져 "핥는" 느낌
    this.g = scene.add.graphics().setDepth(DEPTH.pan);
  }

  /** 매 프레임 — 불꽃 플리커 재드로우 */
  update(timeMs: number): void {
    const g = this.g;
    g.clear();
    const from = (STOVE.arcFromDeg * Math.PI) / 180;
    const to = (STOVE.arcToDeg * Math.PI) / 180;
    const n = STOVE.flameCount;
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * i) / (n - 1);
      const fx = this.cx + Math.cos(a) * this.rimRx;
      const fy = this.cy + Math.sin(a) * this.rimRy;
      // 플리커 — 불꽃별 위상 다르게
      const flick = 0.75 + 0.25 * Math.sin(timeMs / 90 + i * 1.7);
      if (this.heat === 'gas') {
        // 파란 불꽃 혀 (바깥 + 밝은 심)
        const h = STOVE.flameH * flick;
        const w = STOVE.flameW;
        g.fillStyle(STOVE_STYLE.gasFlame, 0.9);
        g.fillTriangle(fx - w / 2, fy, fx + w / 2, fy, fx, fy - h);
        g.fillStyle(STOVE_STYLE.gasFlameCore, 0.9);
        g.fillTriangle(fx - w * 0.24, fy, fx + w * 0.24, fy, fx, fy - h * 0.55);
      } else if (this.heat === 'brazier' || this.heat === 'campfire') {
        // 숯 덩이 + 잉걸 글로우 (플리커로 밝기 요동)
        g.fillStyle(STOVE_STYLE.coalDark, 1);
        g.fillEllipse(fx, fy + 4, STOVE.flameW * 1.5, STOVE.flameW * 0.9);
        g.fillStyle(STOVE_STYLE.coal, 0.35 + 0.5 * flick);
        g.fillEllipse(fx, fy + 3, STOVE.flameW * 0.9, STOVE.flameW * 0.5);
      }
      // induction/lava 등은 글로우만 (정적 베이스에서 처리)
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
