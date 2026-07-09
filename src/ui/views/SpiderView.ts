import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, SPIDER } from '../../data/layout';
import { SPIDER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import {
  OUTLINE,
  drawBody2Tone,
  drawCheeks,
  drawEye,
  drawOpenSmile,
  darken,
  lighten,
} from './charKit';

/**
 * 닌자 거미 (GDD §8.1 ①) — 천장에서 거미줄 타고 하강, 칼을 이빨로 문 채 팬 위에서 위협.
 * 전조: 내려온다. 윈도우: 위협(전조 바 표시 + 눈 부릅). 성공: 거미줄 절단→낙하. 실패: 위로 후퇴.
 * 디자인 v3: charKit 2톤+외곽선, 닌자 머리띠(이마 철판+매듭 리본), 칼은 입에 앙 물었다.
 */
export class SpiderView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private y = 0;
  private falling = false;
  private fallY = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.x = DESIGN.width * SPIDER.hangXRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    if (this.falling) {
      this.redraw(this.fallY, false, 0);
      return;
    }
    const telY = DESIGN.height * SPIDER.telegraphYRatio;
    const winY = DESIGN.height * SPIDER.windowYRatio;
    if (inst.phase === 'TELEGRAPH') {
      this.y = telY * inst.phaseProgress01;
      this.redraw(this.y, false, 0);
    } else {
      // window: 팬 위에서 살짝 흔들며 위협
      this.y = winY + Math.sin(inst.phaseProgress01 * Math.PI * 6) * 6;
      this.redraw(this.y, true, 1 - inst.phaseProgress01);
    }
  }

  private redraw(bodyY: number, threat: boolean, barFill: number): void {
    const g = this.g;
    const x = this.x;
    const r = SPIDER.bodyR;
    g.clear();
    // 거미줄 (천장→몸통)
    g.lineStyle(3, SPIDER_STYLE.thread, 0.9);
    g.lineBetween(x, 0, x, bodyY - r);
    // 다리 8개 — 외곽선 밑줄 + 본색 + 끝 둥근 캡 (통통한 라인)
    for (let i = 0; i < 4; i++) {
      const dy = -0.4 + i * 0.28;
      const rootY = bodyY + dy * r;
      const tipY = rootY - 8;
      const tipL = x - r - SPIDER.legLen;
      const tipR = x + r + SPIDER.legLen;
      g.lineStyle(8, OUTLINE.color, 1);
      g.lineBetween(x - r * 0.6, rootY, tipL, tipY);
      g.lineBetween(x + r * 0.6, rootY, tipR, tipY);
      g.fillStyle(OUTLINE.color, 1);
      g.fillCircle(tipL, tipY, 4);
      g.fillCircle(tipR, tipY, 4);
      g.lineStyle(4, SPIDER_STYLE.leg, 1);
      g.lineBetween(x - r * 0.6, rootY, tipL, tipY);
      g.lineBetween(x + r * 0.6, rootY, tipR, tipY);
      g.fillStyle(SPIDER_STYLE.leg, 1);
      g.fillCircle(tipL, tipY, 2);
      g.fillCircle(tipR, tipY, 2);
    }
    // 몸통 — 2톤 + 외곽선
    drawBody2Tone(g, x, bodyY, r * 2, r * 2, SPIDER_STYLE.body);
    drawCheeks(g, x, bodyY + r * 0.22, r * 0.6, 4.5);
    // 닌자 머리띠 — 눈 레드 계열 톤다운 밴드 + 이마 철판 + 매듭 리본
    const bandColor = darken(SPIDER_STYLE.eye, 0.8);
    const bandY = bodyY - r * 0.5;
    const bandW = r * 1.9;
    g.fillStyle(bandColor, 1);
    g.fillRoundedRect(x - bandW / 2, bandY - 8, bandW, 16, 8);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeRoundedRect(x - bandW / 2, bandY - 8, bandW, 16, 8);
    // 이마 철판 (닌자 필수템)
    g.fillStyle(SPIDER_STYLE.knife, 1);
    g.fillRoundedRect(x - 11, bandY - 6, 22, 12, 4);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeRoundedRect(x - 11, bandY - 6, 22, 12, 4);
    // 매듭 리본 — 오른쪽으로 팔랑
    const kx = x + bandW / 2 - 2;
    g.fillStyle(bandColor, 1);
    g.fillTriangle(kx, bandY - 4, kx + 20, bandY - 14, kx + 14, bandY + 2);
    g.fillTriangle(kx, bandY + 2, kx + 22, bandY + 6, kx + 12, bandY + 12);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeTriangle(kx, bandY - 4, kx + 20, bandY - 14, kx + 14, bandY + 2);
    g.strokeTriangle(kx, bandY + 2, kx + 22, bandY + 6, kx + 12, bandY + 12);
    g.fillStyle(bandColor, 1);
    g.fillCircle(kx, bandY, 6);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeCircle(kx, bandY, 6);
    // 눈 — 평소엔 아래(팬)를 노려보고, 위협 윈도우엔 부릅! + 붉은 테두리
    const eyeDx = 12;
    const eyeY = bodyY - r * 0.08;
    const eyeR = threat ? 9.5 : 7.5;
    drawEye(g, x - eyeDx, eyeY, eyeR, 0, threat ? 0 : 0.25);
    drawEye(g, x + eyeDx, eyeY, eyeR, 0, threat ? 0 : 0.25);
    if (threat) {
      g.lineStyle(3, SPIDER_STYLE.eye, 0.9);
      g.strokeEllipse(x - eyeDx, eyeY, eyeR * 2 + 6, eyeR * 2.3 + 6);
      g.strokeEllipse(x + eyeDx, eyeY, eyeR * 2 + 6, eyeR * 2.3 + 6);
    }
    // 입 + 이빨로 문 칼 — 벌린 입 위로 칼이 가로지르고 이빨 2개가 앙 물었다
    const mouthY = bodyY + r * 0.45;
    drawOpenSmile(g, x, mouthY - 4, 18);
    // 손잡이(왼쪽, 우드 톤 — 뷰 로컬)
    g.fillStyle(0x8f6a3a, 1);
    g.fillRoundedRect(x - r * 0.85, mouthY - 6, r * 0.5, 12, 5);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeRoundedRect(x - r * 0.85, mouthY - 6, r * 0.5, 12, 5);
    // 칼날(오른쪽으로 길게) + 하이라이트
    g.fillStyle(SPIDER_STYLE.knife, 1);
    g.fillTriangle(x - r * 0.35, mouthY - 6, x - r * 0.35, mouthY + 6, x + r + 26, mouthY);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeTriangle(x - r * 0.35, mouthY - 6, x - r * 0.35, mouthY + 6, x + r + 26, mouthY);
    g.fillStyle(lighten(SPIDER_STYLE.knife, 0.4), 1);
    g.fillTriangle(x - r * 0.3, mouthY - 4, x - r * 0.3, mouthY - 1, x + r + 14, mouthY - 1);
    // 이빨 2개 — 위에서 칼을 물었다
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 8, mouthY - 8, 7, 9);
    g.fillRect(x + 1, mouthY - 8, 7, 9);
    g.lineStyle(2, OUTLINE.color, 1);
    g.strokeRect(x - 8, mouthY - 8, 7, 9);
    g.strokeRect(x + 1, mouthY - 8, 7, 9);
    // 전조 바 (윈도우 중 남은 시간)
    if (threat) {
      const barY = bodyY - r - EVENT_BAR.abovePx;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    // 성공: 거미줄 절단→아래로 낙하 / 실패: 위로 후퇴 (반토막 이펙트는 씬)
    this.falling = true;
    this.fallY = this.y;
    const to = result === 'success' ? DESIGN.height + 120 : -120;
    this.scene.tweens.addCounter({
      from: this.y,
      to,
      duration: result === 'success' ? 380 : 300,
      ease: 'Cubic.easeIn',
      onUpdate: (tw) => {
        this.fallY = tw.getValue() ?? this.y;
        this.redraw(this.fallY, false, 0);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
