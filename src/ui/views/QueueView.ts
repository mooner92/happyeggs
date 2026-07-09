import Phaser from 'phaser';
import { BUBBLE, DEPTH, DESIGN, EMOTE, QUEUE } from '../../data/layout';
import { CUSTOMER_STYLE, EMOTE_STYLE } from '../../data/palette';
import type { ReactionKind } from '../../systems/economy';
import type { Order } from '../../systems/orders';
import { OUTLINE, darken, drawBody2Tone, drawCheeks, drawEye, drawOpenSmile } from './charKit';
import { drawEggIcon } from './eggIcon';

// ── 뷰 로컬 표현 상수 (디자인 v3 — 유머러스 손님 조합) ─────────────────────────
/** 체형 3종 — [너비 배율, 높이 배율]: 둥근 / 키다리 / 땅딸 */
const SHAPES = [
  [1, 1],
  [0.9, 1.15],
  [1.15, 0.85],
] as const;
/** 유휴 숨쉬기 애니 — 미세 세로 스케일 요요 (발끝 고정) */
const BREATH = { scaleY: 1.035, ms: 900, phaseMs: 180 } as const;
/** 말풍선 팝인 — 맨 앞 손님이 바뀔 때만 */
const POP = { from: 0.6, ms: 260 } as const;
const MOUTH_DARK = 0x5c3226; // 입 안 (charKit drawOpenSmile와 동일 톤)
const TONGUE = 0xff8a7a; // 혀
const CREAM = 0xf7f1e5; // 셰프 모자·방울
const LENS_TINT = 0xbfe3ff; // 안경 렌즈 틴트
const SHADES_DARK = 0x23303d; // 선글라스 렌즈

/**
 * 손님 대기열 (GDD §7 + ADR-0011 GPGP 손님 중심) — 디자인 v3 유머러스 캐릭터.
 * 손님별 Container(내부 Graphics 1개) + 절대 번호 해시로 체형·표정·모자·안경·소품 조합.
 * 재생성은 큐 변화 시에만(시그니처 가드) — per-frame 재드로우 아님.
 * 맨 앞 손님은 창구에서 크게(1:1 응대), 서빙 순간 react()로 하트/별/분노 이모트가 떠오른다.
 */
export class QueueView {
  private readonly emoteG: Phaser.GameObjects.Graphics;
  /** 손님·말풍선 컨테이너 — 큐 변화 시 전부 파기 후 재생성 */
  private parts: Phaser.GameObjects.Container[] = [];
  /** 마지막 렌더 시그니처 — 동일하면 재생성 생략 */
  private lastSignature = '';
  /** 마지막 맨 앞 손님의 절대 번호 — 바뀔 때만 말풍선 팝인 */
  private lastFrontAbs = -1;

  constructor(private readonly scene: Phaser.Scene) {
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
   * @param baseIndex 스테이지 내 절대 손님 번호(처리된 수) — 큐가 줄어도 색·조합 정체성 유지 (디자인 v1)
   */
  render(orders: readonly Order[], baseIndex = 0): void {
    const count = Math.min(orders.length, QUEUE.xRatios.length);
    // 큐 변화 시에만 재생성 — 같은 장면이면 스킵 (per-frame 할당 금지)
    const sig = `${baseIndex}|${orders
      .slice(0, count)
      .map((o) => o.eggCount)
      .join(',')}`;
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;
    this.clearParts();

    const y = DESIGN.height * QUEUE.yRatio;
    // 뒤쪽 손님부터 생성해 앞 손님이 위에 오도록 (동일 depth → 표시 순서)
    for (let i = count - 1; i >= 0; i--) {
      const cx = DESIGN.width * QUEUE.xRatios[i]!;
      this.parts.push(this.buildCustomer(cx, y, QUEUE.scales[i]!, baseIndex + i));
    }
    // 맨 앞 손님 말풍선(주문) — 손님이 바뀐 순간에만 팝인
    if (count > 0) {
      const cx = DESIGN.width * QUEUE.xRatios[0]!;
      const bubbleCy = y - QUEUE.bodyH / 2 - BUBBLE.abovePx + BUBBLE.h;
      this.parts.push(this.buildBubble(cx, bubbleCy, orders[0]!.eggCount, this.lastFrontAbs !== baseIndex));
      this.lastFrontAbs = baseIndex;
    } else {
      this.lastFrontAbs = -1;
    }
  }

  /** 손님 1명 — 발끝 원점 컨테이너(숨쉬기 스케일에도 접지 고정) + Graphics 1개 */
  private buildCustomer(cx: number, cy: number, scale: number, index: number): Phaser.GameObjects.Container {
    const groundY = cy + QUEUE.bodyH * scale * 0.5;
    const container = this.scene.add.container(cx, groundY).setDepth(DEPTH.queue);
    const g = this.scene.add.graphics();
    container.add(g);

    // 절대 번호 해시 → 조합 (같은 손님은 항상 같은 모습)
    const hash = (index * 2654435761) >>> 0;
    const shape = SHAPES[(hash >>> 5) % SHAPES.length]!;
    const eyeKind = (hash >>> 7) % 4; // 보통/졸린 반눈/동그란 놀람/윙크
    const mouthKind = (hash >>> 9) % 4; // 열린 스마일/씩 웃음/오물/혀 내밈
    const hat = hash % 4; // 없음/셰프/비니/캡
    const eyewear = (hash >>> 3) % 3; // 없음/동그란 안경/선글라스
    const extra = (hash >>> 11) % 3; // 없음/콧수염/나비넥타이
    const color = CUSTOMER_STYLE.bodies[index % CUSTOMER_STYLE.bodies.length]!;
    const accent = CUSTOMER_STYLE.bodies[(index + 2) % CUSTOMER_STYLE.bodies.length]!;
    const accent2 = CUSTOMER_STYLE.bodies[(index + 3) % CUSTOMER_STYLE.bodies.length]!;

    const bw = QUEUE.bodyW * scale * shape[0];
    const bh = QUEUE.bodyH * scale * shape[1];
    const bcy = -bh / 2; // 발끝(y=0) 기준 몸통 중심

    // 접지 그림자
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(0, 0, bw * 0.95, bh * 0.16);
    // 몸통 — 2톤 셰이딩 + 굵은 웜브라운 외곽선 (캐릭터 공통 5px)
    drawBody2Tone(g, 0, bcy, bw, bh, color);
    // 얼굴 (눈·볼·입)
    this.drawFace(g, bw, bh, bcy, eyeKind, mouthKind);
    // 소품 — 콧수염은 얼굴 위, 넥타이는 몸통 아래쪽
    this.drawExtra(g, bw, bh, bcy, scale, extra, accent2);
    // 안경류 (눈 위에 덧그림)
    this.drawEyewear(g, bw, bh, bcy, scale, eyewear);
    // 모자 (맨 위)
    this.drawHat(g, bw, bh, bcy, scale, hat, accent);

    // 유휴 숨쉬기 — 손님별 위상 딜레이로 살아있는 느낌
    this.scene.tweens.add({
      targets: container,
      scaleY: BREATH.scaleY,
      duration: BREATH.ms,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: ((hash >>> 13) % 5) * BREATH.phaseMs,
    });
    return container;
  }

  /** 눈 4종 + 볼터치 + 입 4종 */
  private drawFace(
    g: Phaser.GameObjects.Graphics,
    bw: number,
    bh: number,
    bcy: number,
    eyeKind: number,
    mouthKind: number,
  ): void {
    const eyeDx = bw * 0.17;
    const eyeY = bcy - bh * 0.1;
    const r = bw * 0.085;
    const lw = Math.max(2, r * 0.35);

    if (eyeKind === 0) {
      // 보통 — 흰자+동공+글린트
      drawEye(g, -eyeDx, eyeY, r);
      drawEye(g, eyeDx, eyeY, r);
    } else if (eyeKind === 1) {
      // 졸린 반눈
      this.drawSleepyEye(g, -eyeDx, eyeY, r);
      this.drawSleepyEye(g, eyeDx, eyeY, r);
    } else if (eyeKind === 2) {
      // 동그란 놀람
      this.drawSurprisedEye(g, -eyeDx, eyeY, r);
      this.drawSurprisedEye(g, eyeDx, eyeY, r);
    } else {
      // 윙크 — 왼눈 뜨고 오른눈 감은 ∩ 호
      drawEye(g, -eyeDx, eyeY, r);
      g.lineStyle(lw, OUTLINE.color, 1);
      g.beginPath();
      g.arc(eyeDx, eyeY + r * 0.2, r * 0.8, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
      g.strokePath();
    }

    drawCheeks(g, 0, eyeY + bh * 0.13, bw * 0.3, bw * 0.06);

    const mouthY = bcy + bh * 0.13;
    const grinLw = Math.max(3, bw * 0.035);
    if (mouthKind === 0) {
      // 열린 스마일 (입 안 + 혀)
      drawOpenSmile(g, 0, mouthY - bw * 0.02, bw * 0.3);
    } else if (mouthKind === 1) {
      // 씩 웃음 — 아래로 볼록한 호
      g.lineStyle(grinLw, OUTLINE.color, 1);
      g.beginPath();
      g.arc(0, mouthY - bw * 0.05, bw * 0.16, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
      g.strokePath();
    } else if (mouthKind === 2) {
      // 오물 — 작은 타원 입
      g.fillStyle(MOUTH_DARK, 1);
      g.fillEllipse(0, mouthY, bw * 0.11, bw * 0.14);
      g.lineStyle(Math.max(2, grinLw - 1), OUTLINE.color, 1);
      g.strokeEllipse(0, mouthY, bw * 0.11, bw * 0.14);
    } else {
      // 씩 웃음 + 혀 내밈
      g.lineStyle(grinLw, OUTLINE.color, 1);
      g.beginPath();
      g.arc(0, mouthY - bw * 0.05, bw * 0.16, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
      g.strokePath();
      g.fillStyle(TONGUE, 1);
      g.fillEllipse(bw * 0.06, mouthY + bw * 0.05, bw * 0.12, bw * 0.15);
      g.lineStyle(Math.max(2, grinLw - 1), OUTLINE.color, 1);
      g.strokeEllipse(bw * 0.06, mouthY + bw * 0.05, bw * 0.12, bw * 0.15);
    }
  }

  /** 졸린 반눈 — 아래 반달 흰자 + 반쯤 감긴 동공 + 눈꺼풀 라인 */
  private drawSleepyEye(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    const lw = Math.max(2, r * 0.35);
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI, false);
    g.closePath();
    g.fillPath();
    g.lineStyle(lw, OUTLINE.color, 1);
    g.strokePath();
    g.fillStyle(OUTLINE.color, 1);
    g.fillEllipse(x, y + r * 0.32, r * 0.9, r * 0.55);
    g.lineStyle(lw, OUTLINE.color, 1);
    g.lineBetween(x - r, y, x + r, y);
  }

  /** 동그란 놀람 눈 — 큰 흰자 원 + 작은 동공 + 글린트 */
  private drawSurprisedEye(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x, y, r * 1.15);
    g.lineStyle(Math.max(2, r * 0.35), OUTLINE.color, 1);
    g.strokeCircle(x, y, r * 1.15);
    g.fillStyle(OUTLINE.color, 1);
    g.fillCircle(x, y, r * 0.42);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - r * 0.15, y - r * 0.18, r * 0.15);
  }

  /** 모자 4종 — 없음/셰프/비니/캡 (외곽선 + 2톤 셰이딩) */
  private drawHat(
    g: Phaser.GameObjects.Graphics,
    bw: number,
    bh: number,
    bcy: number,
    scale: number,
    hat: number,
    accent: number,
  ): void {
    const pw = Math.max(2, OUTLINE.prop * scale);
    const hy = bcy - bh * 0.42;

    if (hat === 1) {
      // 셰프 모자 — 흰 뭉게 3덩이(외곽선 2패스: 굵은 선 → 채움 덮기로 유니온 외곽선) + 밴드
      const puffs: readonly (readonly [number, number, number, number])[] = [
        [0, hy - bh * 0.17, bw * 0.6, bh * 0.3],
        [-bw * 0.21, hy - bh * 0.1, bw * 0.34, bh * 0.24],
        [bw * 0.21, hy - bh * 0.1, bw * 0.34, bh * 0.24],
      ];
      g.lineStyle(pw * 2, OUTLINE.color, 1);
      for (const [px, py, w, h] of puffs) g.strokeEllipse(px, py, w, h);
      g.fillStyle(CREAM, 1);
      for (const [px, py, w, h] of puffs) g.fillEllipse(px, py, w, h);
      // 밴드 — 살짝 어두운 크림(셰이딩)
      g.fillStyle(darken(CREAM, 0.9), 1);
      g.fillRect(-bw * 0.28, hy - bh * 0.06, bw * 0.56, bh * 0.1);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeRect(-bw * 0.28, hy - bh * 0.06, bw * 0.56, bh * 0.1);
    } else if (hat === 2) {
      // 비니 — 색 돔 + 어두운 접힌 챙 + 방울
      g.fillStyle(accent, 1);
      g.beginPath();
      g.arc(0, hy, bw * 0.34, Math.PI, 0, false);
      g.closePath();
      g.fillPath();
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokePath();
      g.fillStyle(darken(accent), 1);
      g.fillRect(-bw * 0.36, hy - bh * 0.03, bw * 0.72, bh * 0.09);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeRect(-bw * 0.36, hy - bh * 0.03, bw * 0.72, bh * 0.09);
      g.fillStyle(CREAM, 1);
      g.fillCircle(0, hy - bw * 0.34, 7 * scale);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeCircle(0, hy - bw * 0.34, 7 * scale);
      // 돔 하이라이트
      g.fillStyle(0xffffff, 0.16);
      g.fillEllipse(-bw * 0.1, hy - bw * 0.18, bw * 0.22, bh * 0.08);
    } else if (hat === 3) {
      // 캡 — 색 돔 + 어두운 챙(오른쪽) + 꼭지 단추
      g.fillStyle(accent, 1);
      g.beginPath();
      g.arc(0, hy, bw * 0.32, Math.PI, 0, false);
      g.closePath();
      g.fillPath();
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokePath();
      g.fillStyle(darken(accent), 1);
      g.fillEllipse(bw * 0.3, hy, bw * 0.38, bh * 0.08);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeEllipse(bw * 0.3, hy, bw * 0.38, bh * 0.08);
      g.fillStyle(darken(accent), 1);
      g.fillCircle(0, hy - bw * 0.32, 5 * scale);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeCircle(0, hy - bw * 0.32, 5 * scale);
      // 돔 하이라이트
      g.fillStyle(0xffffff, 0.16);
      g.fillEllipse(-bw * 0.08, hy - bw * 0.16, bw * 0.2, bh * 0.07);
    }
  }

  /** 눈장식 3종 — 없음/동그란 안경/선글라스 */
  private drawEyewear(
    g: Phaser.GameObjects.Graphics,
    bw: number,
    bh: number,
    bcy: number,
    scale: number,
    eyewear: number,
  ): void {
    if (eyewear === 0) return;
    const pw = Math.max(2, OUTLINE.prop * scale);
    const eyeDx = bw * 0.17;
    const eyeY = bcy - bh * 0.1;
    const r = bw * 0.085;

    if (eyewear === 1) {
      // 동그란 안경 — 틴트 렌즈 + 브리지 + 다리
      const gr = r * 1.3;
      g.fillStyle(LENS_TINT, 0.25);
      g.fillCircle(-eyeDx, eyeY, gr);
      g.fillCircle(eyeDx, eyeY, gr);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeCircle(-eyeDx, eyeY, gr);
      g.strokeCircle(eyeDx, eyeY, gr);
      g.lineBetween(-eyeDx + gr, eyeY, eyeDx - gr, eyeY);
      g.lineBetween(-eyeDx - gr, eyeY, -bw * 0.48, eyeY - bh * 0.02);
      g.lineBetween(eyeDx + gr, eyeY, bw * 0.48, eyeY - bh * 0.02);
    } else {
      // 선글라스 — 다크 렌즈 + 브리지 + 흰 글린트
      const lw2 = r * 1.2;
      g.fillStyle(SHADES_DARK, 1);
      g.fillRoundedRect(-eyeDx - lw2, eyeY - r * 0.9, lw2 * 2, r * 1.8, r * 0.6);
      g.fillRoundedRect(eyeDx - lw2, eyeY - r * 0.9, lw2 * 2, r * 1.8, r * 0.6);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeRoundedRect(-eyeDx - lw2, eyeY - r * 0.9, lw2 * 2, r * 1.8, r * 0.6);
      g.strokeRoundedRect(eyeDx - lw2, eyeY - r * 0.9, lw2 * 2, r * 1.8, r * 0.6);
      g.lineBetween(-eyeDx + lw2, eyeY - r * 0.3, eyeDx - lw2, eyeY - r * 0.3);
      g.lineStyle(Math.max(2, r * 0.25), 0xffffff, 0.5);
      g.lineBetween(-eyeDx - r * 0.5, eyeY + r * 0.4, -eyeDx + r * 0.1, eyeY - r * 0.4);
      g.lineBetween(eyeDx - r * 0.5, eyeY + r * 0.4, eyeDx + r * 0.1, eyeY - r * 0.4);
    }
  }

  /** 추가 소품 3종 — 없음/콧수염/나비넥타이 */
  private drawExtra(
    g: Phaser.GameObjects.Graphics,
    bw: number,
    bh: number,
    bcy: number,
    scale: number,
    extra: number,
    accent2: number,
  ): void {
    if (extra === 1) {
      // 콧수염 — 웜브라운 두 갈래 + 끝 컬
      const my = bcy + bh * 0.13 - bw * 0.09;
      g.fillStyle(OUTLINE.color, 1);
      g.fillEllipse(-bw * 0.1, my, bw * 0.18, bw * 0.075);
      g.fillEllipse(bw * 0.1, my, bw * 0.18, bw * 0.075);
      g.fillCircle(-bw * 0.19, my - bw * 0.015, bw * 0.035);
      g.fillCircle(bw * 0.19, my - bw * 0.015, bw * 0.035);
    } else if (extra === 2) {
      // 나비넥타이 — 악센트색 리본 + 매듭
      const pw = Math.max(2, OUTLINE.prop * scale);
      const ny = bcy + bh * 0.36;
      g.fillStyle(accent2, 1);
      g.fillTriangle(-bw * 0.16, ny - bw * 0.07, -bw * 0.16, ny + bw * 0.07, -bw * 0.02, ny);
      g.fillTriangle(bw * 0.16, ny - bw * 0.07, bw * 0.16, ny + bw * 0.07, bw * 0.02, ny);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeTriangle(-bw * 0.16, ny - bw * 0.07, -bw * 0.16, ny + bw * 0.07, -bw * 0.02, ny);
      g.strokeTriangle(bw * 0.16, ny - bw * 0.07, bw * 0.16, ny + bw * 0.07, bw * 0.02, ny);
      g.fillStyle(darken(accent2), 1);
      g.fillCircle(0, ny, bw * 0.045);
      g.lineStyle(pw, OUTLINE.color, 1);
      g.strokeCircle(0, ny, bw * 0.045);
    }
  }

  /** 말풍선 — 흰 라운드 + 웜브라운 외곽선 + 아래 그림자 + 꼬리, 손님 교대 시 팝인 */
  private buildBubble(
    cx: number,
    cy: number,
    eggCount: number,
    pop: boolean,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(cx, cy).setDepth(DEPTH.queue);
    const g = this.scene.add.graphics();
    container.add(g);

    const totalW = BUBBLE.w + (eggCount - 1) * BUBBLE.eggGapPx;
    const left = -totalW / 2;
    const hh = BUBBLE.h / 2;
    // 아래 그림자
    g.fillStyle(0x000000, 0.16);
    g.fillRoundedRect(left + 4, -hh + 8, totalW, BUBBLE.h, 18);
    // 꼬리 (몸통보다 먼저 — 윗변 이음새는 몸통 채움이 덮는다)
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-14, hh - 2, 14, hh - 2, 0, hh + 22);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeTriangle(-14, hh - 2, 14, hh - 2, 0, hh + 22);
    // 몸통
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(left, -hh, totalW, BUBBLE.h, 18);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeRoundedRect(left, -hh, totalW, BUBBLE.h, 18);
    // 꼬리 이음 정리 — 몸통 아랫변 외곽선이 꼬리를 가로지르지 않게 안쪽 흰 삼각형으로 덮기
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-10, hh - 3, 10, hh - 3, 0, hh + 17);
    // 계란 아이콘 × N (주문 수)
    for (let i = 0; i < eggCount; i++) {
      drawEggIcon(g, left + BUBBLE.w / 2 + i * BUBBLE.eggGapPx, 0, BUBBLE.eggIconR);
    }

    if (pop) {
      // 맨 앞 손님이 바뀐 순간에만 팝인
      container.setScale(POP.from);
      this.scene.tweens.add({ targets: container, scale: 1, duration: POP.ms, ease: 'Back.easeOut' });
    }
    return container;
  }

  /** 컨테이너·트윈 전부 정리 */
  private clearParts(): void {
    for (const c of this.parts) {
      this.scene.tweens.killTweensOf(c);
      c.destroy();
    }
    this.parts = [];
  }

  destroy(): void {
    this.clearParts();
    this.scene.tweens.killTweensOf(this.emoteG);
    this.emoteG.destroy();
  }
}
