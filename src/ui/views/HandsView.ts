import Phaser from 'phaser';
import { ANCHORS, DEPTH, HAND_SHAPE, toPx } from '../../data/layout';
import { HAND_STYLE, PALETTE, SPATULA_STYLE } from '../../data/palette';
import { addSoftShadow } from '../textures';
import { OUTLINE, darken, drawBody2Tone, lighten } from './charKit';

/**
 * 1인칭 양손 — 왼손은 **다음 계란을 쥐고**(재고 어포던스 + "깨기" 유도), 오른손은 뒤집개.
 * 계란은 재고에 따라 setHeldEgg로 갱신(재고 0이면 빈손). 손 도형은 정적 1회 드로우.
 * 디자인 v3: 노란 타원 주먹 → 통통한 요리 미트(엄지 볼록 + 커프스 밴드 + 2톤 + 웜브라운 외곽선).
 */
export class HandsView {
  private readonly eggG: Phaser.GameObjects.Graphics;
  private readonly pokeG: Phaser.GameObjects.Graphics;
  private readonly left: { x: number; y: number };
  private readonly right: { x: number; y: number };
  private held = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.left = toPx(ANCHORS.handLeft);
    this.right = toPx(ANCHORS.handRight);
    const left = this.left;
    const right = this.right;
    const pan = toPx(ANCHORS.pan);
    // 손 접지 그림자
    for (const p of [left, right]) {
      addSoftShadow(scene, p.x, p.y + HAND_SHAPE.h * 0.45, HAND_SHAPE.w * 1.6, HAND_SHAPE.h, DEPTH.hand - 1, 0.4);
    }
    // 쥔 계란 — 주먹보다 먼저 생성(같은 depth) → 주먹이 계란 아래를 가려 "쥔" 모양
    this.eggG = scene.add.graphics().setDepth(DEPTH.hand);
    // 밀기 포크 고스트 — 뒤집개 날이 탭 지점으로 갔다 온다 (ADR-0012)
    this.pokeG = scene.add.graphics().setDepth(DEPTH.hand + 1).setAlpha(0);

    const g = scene.add.graphics().setDepth(DEPTH.hand);

    // ── 오른손 뒤집개 — 손에서 팬 쪽으로 뻗는 손잡이(나무) + 밝은 금속 날 ──
    const bladeX = right.x + (pan.x - right.x) * HAND_SHAPE.spatulaReach;
    const bladeY = right.y + (pan.y - right.y) * HAND_SHAPE.spatulaReach;
    const bx = bladeX - HAND_SHAPE.bladeW / 2;
    const by = bladeY - HAND_SHAPE.bladeH / 2;
    const radius = HAND_SHAPE.bladeH / 4;
    // 손잡이 — 웜브라운 외곽선을 아래 깔고 나무 막대 + 결 하이라이트 (v3)
    g.lineStyle(HAND_SHAPE.spatulaW + OUTLINE.prop * 2, OUTLINE.color, 1);
    g.lineBetween(right.x, right.y, bladeX, bladeY);
    g.lineStyle(HAND_SHAPE.spatulaW, SPATULA_STYLE.handle, 1);
    g.lineBetween(right.x, right.y, bladeX, bladeY);
    g.lineStyle(HAND_SHAPE.spatulaW * 0.32, lighten(SPATULA_STYLE.handle, 0.3), 1);
    g.lineBetween(right.x, right.y, bladeX, bladeY);
    // 날 — 2톤 금속(상단 하이라이트 + 하단 셰이드) + 김 빠지는 슬롯 2개
    g.fillStyle(SPATULA_STYLE.blade, 1);
    g.fillRoundedRect(bx, by, HAND_SHAPE.bladeW, HAND_SHAPE.bladeH, radius);
    g.fillStyle(darken(SPATULA_STYLE.blade), 1);
    g.fillRoundedRect(
      bx + 4,
      by + HAND_SHAPE.bladeH * 0.58,
      HAND_SHAPE.bladeW - 8,
      HAND_SHAPE.bladeH * 0.36,
      radius * 0.7,
    );
    g.fillStyle(lighten(SPATULA_STYLE.blade, 0.28), 1);
    g.fillRoundedRect(bx + 6, by + 5, HAND_SHAPE.bladeW - 12, HAND_SHAPE.bladeH * 0.2, radius * 0.6);
    const slotW = HAND_SHAPE.bladeW * 0.09;
    const slotH = HAND_SHAPE.bladeH * 0.5;
    g.fillStyle(darken(SPATULA_STYLE.blade, 0.55), 1);
    g.fillRoundedRect(bladeX - HAND_SHAPE.bladeW * 0.28, bladeY - slotH / 2, slotW, slotH, slotW / 2);
    g.fillRoundedRect(bladeX - HAND_SHAPE.bladeW * 0.04, bladeY - slotH / 2, slotW, slotH, slotW / 2);
    // 날 외곽선 (v3: 웜브라운)
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeRoundedRect(bx, by, HAND_SHAPE.bladeW, HAND_SHAPE.bladeH, radius);
    // 리벳 2개 — 손잡이가 붙는 쪽(오른손 방향)
    this.drawRivet(g, bx + HAND_SHAPE.bladeW * 0.82, by + HAND_SHAPE.bladeH * 0.3);
    this.drawRivet(g, bx + HAND_SHAPE.bladeW * 0.82, by + HAND_SHAPE.bladeH * 0.7);

    // ── 양손 미트 — 날 위에 그려 손이 도구를 쥔 것으로 보이게. 엄지는 안쪽(팬 방향) ──
    this.drawMitt(g, left.x, left.y, 1);
    this.drawMitt(g, right.x, right.y, -1);
  }

  /** 통통한 요리 미트 1개 — 엄지 볼록 + 2톤 셰이딩 + 퀼팅 스티치 + 손목 커프스 밴드. side: 엄지 방향 */
  private drawMitt(g: Phaser.GameObjects.Graphics, x: number, y: number, side: 1 | -1): void {
    const w = HAND_SHAPE.w;
    const h = HAND_SHAPE.h;
    // 엄지 — 몸통보다 먼저 외곽선까지 그리고, 몸통이 안쪽 선을 덮어 실루엣을 하나로 만든다
    const tx = x + side * w * 0.42;
    const ty = y - h * 0.24;
    g.fillStyle(HAND_STYLE.fill, 1);
    g.fillEllipse(tx, ty, w * 0.36, h * 0.44);
    g.lineStyle(HAND_SHAPE.outline, OUTLINE.color, 1);
    g.strokeEllipse(tx, ty, w * 0.36, h * 0.44);
    // 몸통 — 2톤(하단 셰이드 + 정수리 하이라이트) + 외곽선 (charKit)
    drawBody2Tone(g, x, y, w, h, HAND_STYLE.fill, HAND_SHAPE.outline);
    // 이음 패치 — 엄지/몸통 외곽선이 겹치는 자리를 본색으로 덮어 한 덩어리로
    g.fillStyle(HAND_STYLE.fill, 1);
    g.fillEllipse(x + side * w * 0.35, y - h * 0.2, w * 0.18, h * 0.26);
    // 퀼팅 스티치 — 미트 특유의 누빔 곡선 (은은하게)
    g.lineStyle(3, darken(HAND_STYLE.fill, 0.72), 0.5);
    g.beginPath();
    g.arc(x - side * w * 0.06, y - h * 0.05, w * 0.3, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
    // 손목 커프스 밴드 — 크림색 니트 + 골 스트라이프 + 외곽선
    const cw = w * 0.8;
    const ch = h * 0.44;
    const cuffY = y + h * 0.3;
    const cuffFill = lighten(HAND_STYLE.fill, 0.5);
    g.fillStyle(cuffFill, 1);
    g.fillRoundedRect(x - cw / 2, cuffY, cw, ch, 12);
    g.fillStyle(darken(cuffFill, 0.86), 1);
    for (const fx of [-0.22, 0, 0.22]) {
      g.fillRoundedRect(x + cw * fx - 3, cuffY + 6, 6, ch - 12, 3);
    }
    g.lineStyle(HAND_SHAPE.outline, OUTLINE.color, 1);
    g.strokeRoundedRect(x - cw / 2, cuffY, cw, ch, 12);
  }

  /** 금속 리벳 1개 — 날에 박힌 못 + 글린트 */
  private drawRivet(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(darken(SPATULA_STYLE.blade, 0.66), 1);
    g.fillCircle(x, y, 5);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeCircle(x, y, 5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(x - 1.5, y - 1.5, 1.5);
  }

  /** 뒤집개 포크 — 날 고스트가 오른손→탭 지점으로 순간 이동했다 사라진다 (탭당 1회, per-frame 아님) */
  poke(x: number, y: number): void {
    const g = this.pokeG;
    g.clear();
    // 탭 지점에 날(오른손 방향으로 기울인 라운드 사각) + 손잡이 스텁 — 본체와 같은 v3 스타일
    const angle = Math.atan2(this.right.y - y, this.right.x - x);
    const w = HAND_SHAPE.bladeW * 0.8;
    const h = HAND_SHAPE.bladeH * 0.8;
    g.setPosition(0, 0);
    g.fillStyle(SPATULA_STYLE.blade, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 4);
    g.fillStyle(darken(SPATULA_STYLE.blade), 1);
    g.fillRoundedRect(x - w / 2 + 3, y + h * 0.08, w - 6, h * 0.34, h / 6);
    g.lineStyle(HAND_SHAPE.bladeEdge, OUTLINE.color, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 4);
    g.lineStyle(HAND_SHAPE.spatulaW * 0.7 + 4, OUTLINE.color, 1);
    g.lineBetween(
      x + Math.cos(angle) * w * 0.5,
      y + Math.sin(angle) * h * 0.5,
      x + Math.cos(angle) * w * 1.4,
      y + Math.sin(angle) * h * 1.4,
    );
    g.lineStyle(HAND_SHAPE.spatulaW * 0.7, SPATULA_STYLE.handle, 1);
    g.lineBetween(
      x + Math.cos(angle) * w * 0.5,
      y + Math.sin(angle) * h * 0.5,
      x + Math.cos(angle) * w * 1.4,
      y + Math.sin(angle) * h * 1.4,
    );
    g.setAlpha(1);
    this.scene.tweens.killTweensOf(g);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, ease: 'Quad.easeIn' });
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
    // 껍데기째 계란 — 2톤(하단 셰이드) + 웜브라운 외곽선 + 글린트 (v3)
    g.fillStyle(PALETTE.white, 1);
    g.fillEllipse(x, y, 56, 72);
    g.fillStyle(darken(PALETTE.white, 0.86), 1);
    g.fillEllipse(x, y + 8, 48, 52);
    g.fillStyle(PALETTE.white, 1);
    g.fillEllipse(x, y - 4, 51, 58);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeEllipse(x, y, 56, 72);
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(x - 12, y - 16, 16, 22);
  }
}
