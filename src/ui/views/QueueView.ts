import Phaser from 'phaser';
import { BUBBLE, DEPTH, DESIGN, EMOTE, QUEUE } from '../../data/layout';
import { BUBBLE_STYLE, CUSTOMER_STYLE, EMOTE_STYLE } from '../../data/palette';
import type { ReactionKind } from '../../systems/economy';
import type { Order } from '../../systems/orders';
import { drawEggIcon } from './eggIcon';

/**
 * 손님 대기열 (GDD §7 + ADR-0011 GPGP 손님 중심) — Bacon 톤 절차적 캐릭터.
 * 맨 앞 손님은 창구에서 크게(1:1 응대), 서빙 순간 react()로 하트/별/분노 이모트가 떠오른다.
 */
export class QueueView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly emoteG: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.queue);
    this.emoteG = scene.add.graphics().setDepth(DEPTH.queue + 2);
  }

  /** 서빙 리액션 — 맨 앞 손님 얼굴 옆에서 이모트가 떠오르며 사라진다 (ADR-0011) */
  react(kind: ReactionKind): void {
    const cx = DESIGN.width * QUEUE.xRatios[0]! + EMOTE.dxPx;
    const headY = DESIGN.height * QUEUE.yRatio - QUEUE.bodyH * QUEUE.scales[0]! * 0.38;
    const g = this.emoteG;
    g.clear();
    g.setPosition(0, 0);
    g.setAlpha(1);
    this.drawEmote(g, kind, cx, headY);
    this.scene.tweens.add({
      targets: g,
      y: -EMOTE.risePx,
      alpha: 0,
      duration: EMOTE.riseMs,
      ease: 'Quad.easeOut',
      onComplete: () => g.clear(),
    });
  }

  private drawEmote(g: Phaser.GameObjects.Graphics, kind: ReactionKind, x: number, y: number): void {
    const r = EMOTE.r;
    if (kind === 'love') {
      // 하트 — 원 2개 + 삼각형
      g.fillStyle(EMOTE_STYLE.love, 1);
      g.fillCircle(x - r * 0.42, y - r * 0.28, r * 0.5);
      g.fillCircle(x + r * 0.42, y - r * 0.28, r * 0.5);
      g.fillTriangle(x - r * 0.88, y - r * 0.08, x + r * 0.88, y - r * 0.08, x, y + r * 0.95);
    } else if (kind === 'ok') {
      // 별
      g.fillStyle(EMOTE_STYLE.ok, 1);
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : r * 0.45;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = x + Math.cos(a) * rad;
        const py = y + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
    } else {
      // 분노 마크(💢풍) — 꺾인 선 4개 십자 배열
      g.lineStyle(5, EMOTE_STYLE.angry, 1);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + Math.PI / 4;
        const x1 = x + Math.cos(a) * r * 0.35;
        const y1 = y + Math.sin(a) * r * 0.35;
        const x2 = x + Math.cos(a) * r;
        const y2 = y + Math.sin(a) * r;
        g.lineBetween(x1, y1, x2, y2);
      }
    }
  }

  /**
   * @param baseIndex 스테이지 내 절대 손님 번호(처리된 수) — 큐가 줄어도 색·액세서리 정체성 유지 (디자인 v1)
   */
  render(orders: readonly Order[], baseIndex = 0): void {
    const g = this.g;
    g.clear();
    const y = DESIGN.height * QUEUE.yRatio;
    const count = Math.min(orders.length, QUEUE.xRatios.length);

    // 뒤쪽 손님부터 그려 앞 손님이 위에 오도록
    for (let i = count - 1; i >= 0; i--) {
      const cx = DESIGN.width * QUEUE.xRatios[i]!;
      const scale = QUEUE.scales[i]!;
      this.drawCustomer(g, cx, y, scale, baseIndex + i);
    }
    // 맨 앞 손님 말풍선(주문)
    if (count > 0) {
      const cx = DESIGN.width * QUEUE.xRatios[0]!;
      this.drawBubble(g, cx, y - QUEUE.bodyH / 2 - BUBBLE.abovePx + BUBBLE.h, orders[0]!.eggCount);
    }
  }

  private drawCustomer(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    scale: number,
    index: number,
  ): void {
    const w = QUEUE.bodyW * scale;
    const h = QUEUE.bodyH * scale;
    const color = CUSTOMER_STYLE.bodies[index % CUSTOMER_STYLE.bodies.length]!;
    // 접지 그림자
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(cx, cy + h * 0.5, w * 0.95, h * 0.16);
    // 몸통 (둥근 블롭)
    g.fillStyle(color, 1);
    g.fillEllipse(cx, cy, w, h);
    g.lineStyle(4 * scale, CUSTOMER_STYLE.outline, 1);
    g.strokeEllipse(cx, cy, w, h);
    // 눈 두 개
    const eyeDx = w * 0.16;
    const eyeY = cy - h * 0.08;
    g.fillStyle(CUSTOMER_STYLE.face, 1);
    g.fillCircle(cx - eyeDx, eyeY, 5 * scale);
    g.fillCircle(cx + eyeDx, eyeY, 5 * scale);
    // 볼 하이라이트
    g.fillStyle(CUSTOMER_STYLE.cheek, 0.18);
    g.fillCircle(cx - w * 0.24, eyeY + h * 0.1, 8 * scale);
    g.fillCircle(cx + w * 0.24, eyeY + h * 0.1, 8 * scale);
    // 미소 (아래로 볼록한 호)
    g.lineStyle(4 * scale, CUSTOMER_STYLE.face, 1);
    g.beginPath();
    g.arc(cx, eyeY + h * 0.06, w * 0.16, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
    // 개성 액세서리 (디자인 v1) — 절대 번호 해시로 결정(같은 손님은 계속 같은 모습)
    this.drawAccessories(g, cx, cy, w, h, scale, eyeDx, eyeY, index);
  }

  /** 모자·안경 — index 해시로 조합 (없음 포함, Bacon 톤 단순 도형) */
  private drawAccessories(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    w: number,
    h: number,
    scale: number,
    eyeDx: number,
    eyeY: number,
    index: number,
  ): void {
    const hash = (index * 2654435761) >>> 0;
    const hat = hash % 4;
    const eyewear = (hash >> 3) % 3;
    const accent = CUSTOMER_STYLE.bodies[(index + 2) % CUSTOMER_STYLE.bodies.length]!;
    const headY = cy - h * 0.42;

    // 모자
    if (hat === 1) {
      // 셰프 모자 — 흰 뭉게 + 밴드
      g.fillStyle(0xf7f1e5, 1);
      g.fillEllipse(cx, headY - h * 0.16, w * 0.62, h * 0.3);
      g.fillEllipse(cx - w * 0.18, headY - h * 0.22, w * 0.3, h * 0.22);
      g.fillEllipse(cx + w * 0.18, headY - h * 0.22, w * 0.3, h * 0.22);
      g.fillRect(cx - w * 0.28, headY - h * 0.06, w * 0.56, h * 0.1);
      g.lineStyle(3 * scale, CUSTOMER_STYLE.outline, 1);
      g.strokeRect(cx - w * 0.28, headY - h * 0.06, w * 0.56, h * 0.1);
    } else if (hat === 2) {
      // 비니 — 색 돔 + 접힌 챙 + 방울
      g.fillStyle(accent, 1);
      g.beginPath();
      g.arc(cx, headY, w * 0.34, Math.PI, 0, false);
      g.closePath();
      g.fillPath();
      g.fillRect(cx - w * 0.34, headY - h * 0.03, w * 0.68, h * 0.08);
      g.fillStyle(0xf7f1e5, 1);
      g.fillCircle(cx, headY - w * 0.34, 6 * scale);
    } else if (hat === 3) {
      // 캡 — 돔 + 챙(오른쪽)
      g.fillStyle(accent, 1);
      g.beginPath();
      g.arc(cx, headY, w * 0.32, Math.PI, 0, false);
      g.closePath();
      g.fillPath();
      g.fillEllipse(cx + w * 0.3, headY, w * 0.36, h * 0.07);
    }

    // 안경류 (눈 위에 덧그림)
    if (eyewear === 1) {
      // 동그란 안경
      g.lineStyle(3 * scale, CUSTOMER_STYLE.outline, 1);
      g.strokeCircle(cx - eyeDx, eyeY, 9 * scale);
      g.strokeCircle(cx + eyeDx, eyeY, 9 * scale);
      g.lineBetween(cx - eyeDx + 9 * scale, eyeY, cx + eyeDx - 9 * scale, eyeY);
    } else if (eyewear === 2) {
      // 선글라스
      g.fillStyle(CUSTOMER_STYLE.outline, 1);
      g.fillRoundedRect(cx - eyeDx - 10 * scale, eyeY - 7 * scale, 20 * scale, 13 * scale, 4);
      g.fillRoundedRect(cx + eyeDx - 10 * scale, eyeY - 7 * scale, 20 * scale, 13 * scale, 4);
      g.lineStyle(3 * scale, CUSTOMER_STYLE.outline, 1);
      g.lineBetween(cx - eyeDx + 10 * scale, eyeY - 2, cx + eyeDx - 10 * scale, eyeY - 2);
    }
  }

  private drawBubble(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    eggCount: number,
  ): void {
    const totalW = BUBBLE.w + (eggCount - 1) * BUBBLE.eggGapPx;
    const left = cx - totalW / 2;
    // 말풍선 몸통 + 꼬리
    g.fillStyle(BUBBLE_STYLE.fill, 1);
    g.fillRoundedRect(left, cy - BUBBLE.h / 2, totalW, BUBBLE.h, 18);
    g.fillTriangle(cx - 14, cy + BUBBLE.h / 2 - 2, cx + 14, cy + BUBBLE.h / 2 - 2, cx, cy + BUBBLE.h / 2 + 22);
    g.lineStyle(3, BUBBLE_STYLE.edge, 1);
    g.strokeRoundedRect(left, cy - BUBBLE.h / 2, totalW, BUBBLE.h, 18);
    // 계란 아이콘 × N
    for (let i = 0; i < eggCount; i++) {
      drawEggIcon(g, left + BUBBLE.w / 2 + i * BUBBLE.eggGapPx, cy, BUBBLE.eggIconR);
    }
  }

  destroy(): void {
    this.g.destroy();
    this.emoteG.destroy();
  }
}
