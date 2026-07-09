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
import { NIGHT_STYLE, STOVE_STYLE } from '../../data/palette';

/**
 * 스토브 (구체화 패스, GDD §6.2) — 열원 계수를 눈에 보이게.
 * 팬 하단 림을 따라 gas=파란 불꽃 링 / brazier=벌건 숯+잉걸 / 그 외=붉은 글로우.
 * 불꽃은 사인 플리커로 매 프레임 재드로우(도형 ~10개 — 예산 내).
 */
export class StoveView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly cx: number;
  private readonly cy: number;
  private readonly rimRx: number;
  private readonly rimRy: number;
  /** 불 상태 (M5) — 꺼짐 + 가짜불 스티커(열화상에서 차갑게) */
  private fireOn = true;
  private fake = false;

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

    // 열기 글로우 — 열원색 소프트 글로우 (불 상태에 따라 토글)
    const glowColor = heat === 'gas' ? STOVE_STYLE.gasFlame : STOVE_STYLE.emberGlow;
    this.glow = scene.add
      .image(this.cx, this.cy + this.rimRy * 0.7, 'soft-glow')
      .setDisplaySize(this.rimRx * 2.2, this.rimRy * 1.6)
      .setTint(glowColor)
      .setAlpha(heat === 'gas' ? 0.16 : 0.24)
      .setDepth(DEPTH.pan - 1);

    // 불꽃/숯 — 팬과 같은 depth에 팬 이후 생성 → 하단 림 위로 그려져 "핥는" 느낌
    this.g = scene.add.graphics().setDepth(DEPTH.pan);
  }

  /** 야간(열화상) — 불꽃·글로우를 오버레이 위로 올려 "뜨거운 것만 밝게" (M5) */
  setNight(): void {
    this.g.setDepth(DEPTH.hot);
    this.glow.setDepth(DEPTH.hot - 1);
  }

  /** 불 상태 변경 (M5 불 끄기 적) — fake=가짜불 스티커(차가운 파란 불꽃으로 렌더) */
  setFire(on: boolean, fake = false): void {
    this.fireOn = on;
    this.fake = fake;
    this.glow.setVisible(on || fake);
    if (fake) this.glow.setTint(NIGHT_STYLE.coldFlame).setAlpha(0.14);
    else if (on) {
      this.glow
        .setTint(this.heat === 'gas' ? STOVE_STYLE.gasFlame : STOVE_STYLE.emberGlow)
        .setAlpha(this.heat === 'gas' ? 0.16 : 0.24);
    }
    if (!on && !fake) this.g.clear();
  }

  /** 매 프레임 — 불꽃 플리커 재드로우 */
  update(timeMs: number): void {
    const g = this.g;
    if (!this.fireOn && !this.fake) return; // 불 꺼짐 — 아무것도 안 그림
    g.clear();
    const from = (STOVE.arcFromDeg * Math.PI) / 180;
    const to = (STOVE.arcToDeg * Math.PI) / 180;
    const n = STOVE.flameCount;
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * i) / (n - 1);
      const fx = this.cx + Math.cos(a) * this.rimRx;
      const fy = this.cy + Math.sin(a) * this.rimRy;
      // 플리커 — 불꽃별 위상 다르게 (가짜불은 부자연스럽게 굳은 플리커)
      const flick = this.fake ? 0.85 : 0.75 + 0.25 * Math.sin(timeMs / 90 + i * 1.7);
      if (this.fake) {
        // 가짜불 스티커 — 모양은 불꽃인데 열화상에선 차갑게(파랗게) 보인다 (GDD §8.1 ⑦ 트릭)
        const h = STOVE.flameH * flick;
        const w = STOVE.flameW;
        g.fillStyle(NIGHT_STYLE.coldFlame, 0.9);
        g.fillTriangle(fx - w / 2, fy, fx + w / 2, fy, fx, fy - h);
        g.fillStyle(NIGHT_STYLE.coldFlameCore, 0.9);
        g.fillTriangle(fx - w * 0.24, fy, fx + w * 0.24, fy, fx, fy - h * 0.55);
      } else if (this.heat === 'gas') {
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
    this.glow.destroy();
  }
}
