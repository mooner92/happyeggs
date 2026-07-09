import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, ROBBER } from '../../data/layout';
import { ROBBER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import { OUTLINE, drawBody2Tone, drawEye, darken, lighten } from './charKit';

/**
 * 뒷문 강도 (GDD §8.1 ②) — 화면 우측 뒷문에서 슬금슬금 팬 쪽으로 진입.
 * 전조/윈도우 동안 안으로 기어들어옴. 성공(고양이): 우측으로 도주. 실패: 노른자 훔쳐 도주(씬 처리).
 * 디자인 v3: charKit 2톤+외곽선, 후드 안 수상한 반눈 + 도둑 복면 + 줄무늬 상의 힌트,
 * 등에 멘 자루엔 물음표 패치(정체불명의 장물).
 */
export class RobberView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly y: number;
  private x: number;

  constructor(private readonly scene: Phaser.Scene) {
    this.y = DESIGN.height * ROBBER.yRatio;
    this.x = DESIGN.width * ROBBER.edgeXRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    const from = DESIGN.width * ROBBER.edgeXRatio;
    const to = DESIGN.width * ROBBER.targetXRatio;
    const total =
      inst.phase === 'TELEGRAPH' ? inst.phaseProgress01 * 0.5 : 0.5 + inst.phaseProgress01 * 0.5;
    this.x = from + (to - from) * total;
    this.redraw(inst.phase === 'WINDOW' ? 1 - inst.phaseProgress01 : -1);
  }

  private redraw(barFill: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    const w = ROBBER.bodyW;
    const h = ROBBER.bodyH;
    g.clear();
    // 등에 멘 자루 — 2톤(수동, 소품 4px 외곽선) + 매듭 꼭지 + 물음표 패치
    const bx = x + w * 0.45;
    const by = y - h * 0.1;
    const br = w * 0.28;
    g.fillStyle(ROBBER_STYLE.bag, 1);
    g.fillEllipse(bx, by, br * 2, br * 2.1);
    g.fillStyle(darken(ROBBER_STYLE.bag), 1);
    g.fillEllipse(bx, by + br * 0.21, br * 1.8, br * 1.58);
    g.fillStyle(ROBBER_STYLE.bag, 1);
    g.fillEllipse(bx, by - br * 0.13, br * 1.88, br * 1.72);
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(bx - br * 0.28, by - br * 0.63, br * 0.84, br * 0.42);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeEllipse(bx, by, br * 2, br * 2.1);
    g.fillStyle(darken(ROBBER_STYLE.bag), 1);
    g.fillEllipse(bx - br * 0.1, by - br, br * 0.55, br * 0.4);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeEllipse(bx - br * 0.1, by - br, br * 0.55, br * 0.4);
    // 물음표 패치 — 안에 뭐가 들었는지 본인도 모른다
    const px = bx + br * 0.12;
    const py = by + br * 0.1;
    const ps = br * 0.85;
    g.fillStyle(lighten(ROBBER_STYLE.bag, 0.3), 1);
    g.fillRoundedRect(px - ps / 2, py - ps / 2, ps, ps, 5);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeRoundedRect(px - ps / 2, py - ps / 2, ps, ps, 5);
    g.beginPath();
    g.arc(px, py - ps * 0.13, ps * 0.22, Math.PI, Math.PI * 2.45, false);
    g.strokePath();
    g.fillStyle(OUTLINE.color, 1);
    g.fillCircle(px, py + ps * 0.3, 2.5);
    // 몸통 — 2톤 + 외곽선
    drawBody2Tone(g, x, y, w, h, ROBBER_STYLE.body);
    // 가로 줄무늬 상의 힌트 — 타원 폭에 맞춰 안쪽에만 (도둑의 정석 룩)
    g.fillStyle(ROBBER_STYLE.eye, 0.85);
    for (let i = 0; i < 2; i++) {
      const dy = h * (0.12 + i * 0.17);
      const hw = (w / 2) * Math.sqrt(1 - (dy / (h / 2)) ** 2) * 0.88;
      g.fillRoundedRect(x - hw, y + dy - 5, hw * 2, 10, 5);
    }
    // 후드 — 2톤 + 안쪽 얼굴 그늘
    const hy = y - h * 0.28;
    const hoodW = w * 0.9;
    const hoodH = h * 0.5;
    drawBody2Tone(g, x, hy, hoodW, hoodH, ROBBER_STYLE.hood);
    const shade = darken(ROBBER_STYLE.hood, 0.55);
    g.fillStyle(shade, 1);
    g.fillEllipse(x, hy + hoodH * 0.06, hoodW * 0.64, hoodH * 0.66);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeEllipse(x, hy + hoodH * 0.06, hoodW * 0.64, hoodH * 0.66);
    // 눈 — 그늘 속 흰자+동공, 눈꺼풀로 반쯤 덮어 수상한 반눈 (시선은 팬 쪽)
    const eyeY = hy + hoodH * 0.02;
    const edx = w * 0.14;
    drawEye(g, x - edx, eyeY, 7, -0.4, 0.1);
    drawEye(g, x + edx, eyeY, 7, -0.4, 0.1);
    g.fillStyle(shade, 1);
    g.fillRect(x - edx - 9, eyeY - 10, 18, 8);
    g.fillRect(x + edx - 9, eyeY - 10, 18, 8);
    g.lineStyle(3, OUTLINE.color, 1);
    g.lineBetween(x - edx - 8, eyeY - 2, x - edx + 8, eyeY - 2);
    g.lineBetween(x + edx - 8, eyeY - 2, x + edx + 8, eyeY - 2);
    // 얼굴 아래 도둑 복면 — 주름 2줄
    const maskColor = lighten(ROBBER_STYLE.hood, 0.35);
    const my = eyeY + hoodH * 0.24;
    const mw = hoodW * 0.56;
    g.fillStyle(maskColor, 1);
    g.fillRoundedRect(x - mw / 2, my - 9, mw, 20, 9);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeRoundedRect(x - mw / 2, my - 9, mw, 20, 9);
    g.lineStyle(2, darken(maskColor), 1);
    g.lineBetween(x - mw * 0.3, my - 2, x + mw * 0.3, my - 2);
    g.lineBetween(x - mw * 0.22, my + 4, x + mw * 0.22, my + 4);
    // 전조 바
    if (barFill >= 0) {
      const barY = y - h / 2 - EVENT_BAR.abovePx;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  playResolve(_result: 'success' | 'fail', onDone: () => void): void {
    // 성공/실패 모두 우측 뒷문으로 도주 (성공=고양이가 쫓아냄, 실패=노른자 훔쳐 도주)
    this.scene.tweens.addCounter({
      from: this.x,
      to: DESIGN.width + 120,
      duration: 340,
      ease: 'Back.easeIn',
      onUpdate: (tw) => {
        this.x = tw.getValue() ?? this.x;
        this.redraw(-1);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
