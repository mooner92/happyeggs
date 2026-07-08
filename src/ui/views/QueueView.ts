import Phaser from 'phaser';
import { BUBBLE, DEPTH, DESIGN, QUEUE } from '../../data/layout';
import { BUBBLE_STYLE, CUSTOMER_STYLE } from '../../data/palette';
import type { Order } from '../../systems/orders';
import { drawEggIcon } from './eggIcon';

/**
 * 손님 대기열 (GDD §7) — Bacon 톤 절차적 캐릭터(둥근 몸통 + 점 눈 + 미소).
 * 맨 앞(활성) 손님 위에 말풍선으로 주문(계란 × N)을 표시한다. 큐가 바뀔 때 render로 다시 그린다.
 */
export class QueueView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.queue);
  }

  render(orders: readonly Order[]): void {
    const g = this.g;
    g.clear();
    const y = DESIGN.height * QUEUE.yRatio;
    const count = Math.min(orders.length, QUEUE.xRatios.length);

    // 뒤쪽 손님부터 그려 앞 손님이 위에 오도록
    for (let i = count - 1; i >= 0; i--) {
      const cx = DESIGN.width * QUEUE.xRatios[i]!;
      const scale = QUEUE.scales[i]!;
      this.drawCustomer(g, cx, y, scale, i);
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
  }
}
