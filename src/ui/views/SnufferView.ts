import Phaser from 'phaser';
import { DEPTH, DESIGN, EVENT_BAR, SNUFFER } from '../../data/layout';
import { SNUFFER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import { OUTLINE, darken, drawBody2Tone, drawEye, lighten } from './charKit';

/**
 * 불 끄기 적 (GDD §8.1 ⑦, M5 야간) — 소화기를 든 잠입자가 좌측에서 스토브로 접근.
 * 전조: 잠입. 윈도우: 소화기 들어올림(탭 저지 허용). 성공: 움찔하며 도주.
 * 실패: 칙— 분사(불 꺼짐 + 가짜불 스티커는 씬 처리) 후 도주.
 * 디자인 v3: 2톤 몸통 + 정작 본인이 제일 겁먹은 눈(동공 축소 + 덜덜) + 벌벌 떠는 입.
 * 유머 포인트: 소화기에 붙은 해맑은 웃는 스티커 — 이 현장에서 제일 신난 건 소화기다.
 */
export class SnufferView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly y: number;
  private x: number;
  private raise = 0; // 소화기 들어올린 정도 0~1
  private puff = 0; // 분사 연기 진행 0~1

  constructor(private readonly scene: Phaser.Scene) {
    this.y = DESIGN.height * SNUFFER.yRatio;
    this.x = DESIGN.width * SNUFFER.fromXRatio;
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
  }

  update(inst: EventInstance): void {
    const from = DESIGN.width * SNUFFER.fromXRatio;
    const to = DESIGN.width * SNUFFER.toXRatio;
    if (inst.phase === 'TELEGRAPH') {
      this.x = from + (to - from) * inst.phaseProgress01;
      this.raise = 0;
      this.redraw(-1);
    } else {
      this.x = to;
      this.raise = Math.min(1, inst.phaseProgress01 * 2); // 앞 절반 동안 들어올림
      this.redraw(1 - inst.phaseProgress01);
    }
  }

  private redraw(barFill: number): void {
    const g = this.g;
    const x = this.x;
    const y = this.y;
    const w = SNUFFER.bodyW;
    const h = SNUFFER.bodyH;
    g.clear();
    // 접지 그림자 — 다른 캐릭터와 동일 문법
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, y + h * 0.5, w * 0.95, h * 0.14);
    // 몸통 — 2톤 + 외곽선 (겁 많은 잠입자)
    drawBody2Tone(g, x, y, w, h, SNUFFER_STYLE.body);
    // 후드 — 얼굴을 덮는 두건 (안감을 살짝 밝게 = 2톤)
    g.fillStyle(SNUFFER_STYLE.hood, 1);
    g.fillEllipse(x, y - h * 0.26, w * 0.88, h * 0.5);
    g.fillStyle(lighten(SNUFFER_STYLE.hood, 0.12), 1);
    g.fillEllipse(x, y - h * 0.3, w * 0.76, h * 0.34);
    g.lineStyle(OUTLINE.char, OUTLINE.color, 1);
    g.strokeEllipse(x, y - h * 0.26, w * 0.88, h * 0.5);
    // 겁먹은 눈 — drawEye 기반, 동공만 아주 작게(축소 = 공포) + 덜덜 떨림
    const tremble = Math.sin(this.scene.time.now * 0.03) * 1.2;
    const look = tremble + this.raise * 2; // 들어올릴수록 스토브 쪽을 흘깃
    this.drawScaredEye(x - w * 0.16, y - h * 0.26, 8, look);
    this.drawScaredEye(x + w * 0.16, y - h * 0.26, 8, look);
    // 벌벌 떠는 입 — 들어올릴수록 "히익" 하고 벌어진다
    const mh = 8 + this.raise * 9;
    const mouthY = y - h * 0.02;
    g.fillStyle(0x5c3226, 1);
    g.fillEllipse(x + tremble * 0.6, mouthY, 13, mh);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeEllipse(x + tremble * 0.6, mouthY, 13, mh);
    // 소화기 — 빨간 탱크(2톤 + 외곽선) + 노즐 (raise만큼 스토브 쪽으로 들어올림)
    const tx = x + w * 0.55;
    const ty = y - h * (0.05 + this.raise * 0.3);
    g.fillStyle(darken(SNUFFER_STYLE.tank), 1);
    g.fillRoundedRect(tx - 12, ty - 26, 24, 46, 8);
    g.fillStyle(SNUFFER_STYLE.tank, 1);
    g.fillRoundedRect(tx - 12, ty - 26, 24, 36, 8);
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokeRoundedRect(tx - 12, ty - 26, 24, 46, 8);
    // 노즐 (기존 각도·들림 유지)
    g.lineStyle(4, SNUFFER_STYLE.nozzle, 1);
    g.lineBetween(tx, ty - 26, tx + 22 + this.raise * 10, ty - 34 - this.raise * 8);
    // 웃는 스티커 — 정작 소화기가 제일 해맑다 (유머)
    g.fillStyle(0xffe08a, 1);
    g.fillCircle(tx, ty - 4, 8);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeCircle(tx, ty - 4, 8);
    g.fillStyle(OUTLINE.color, 1);
    g.fillCircle(tx - 3, ty - 6, 1.4);
    g.fillCircle(tx + 3, ty - 6, 1.4);
    g.lineStyle(2, OUTLINE.color, 1);
    g.beginPath();
    g.arc(tx, ty - 3, 4, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
    // 분사 연기 (실패 연출) — 위치·타이밍 기존 유지 + 은은한 외곽선
    if (this.puff > 0) {
      for (let i = 0; i < 4; i++) {
        const px = tx + 30 + i * 26 * this.puff;
        const py = ty - 40 - i * 8 * this.puff;
        const pr = 10 + i * 5;
        g.fillStyle(SNUFFER_STYLE.puff, 0.8 * (1 - this.puff));
        g.fillCircle(px, py, pr);
        g.lineStyle(3, OUTLINE.color, 0.35 * (1 - this.puff));
        g.strokeCircle(px, py, pr);
      }
    }
    // 전조 바
    if (barFill >= 0) {
      const barY = y - h / 2 - EVENT_BAR.abovePx * 0.6;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(x - EVENT_BAR.w / 2, barY, EVENT_BAR.w * barFill, EVENT_BAR.h);
    }
  }

  /** 겁먹은 drawEye 변형 — 킷 눈을 그린 뒤 동공만 아주 작게 교체 (동공 축소 = 겁먹음 유머) */
  private drawScaredEye(ex: number, ey: number, r: number, look: number): void {
    const g = this.g;
    drawEye(g, ex, ey, r, 0, 0.15);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(ex, ey + r * 0.15, r * 0.62);
    g.fillStyle(OUTLINE.color, 1);
    g.fillCircle(ex + look, ey + r * 0.15, r * 0.26);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(ex + look - r * 0.09, ey + r * 0.06, r * 0.1);
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    if (result === 'fail') {
      // 칙— 분사 후 도주 (불 꺼짐은 씬)
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 340,
        onUpdate: (tw) => {
          this.puff = tw.getValue() ?? 0;
          this.redraw(-1);
        },
        onComplete: () => this.flee(onDone),
      });
    } else {
      this.flee(onDone); // 저지당해 움찔 도주
    }
  }

  private flee(onDone: () => void): void {
    this.scene.tweens.addCounter({
      from: this.x,
      to: -160,
      duration: 320,
      ease: 'Back.easeIn',
      onUpdate: (tw) => {
        this.x = tw.getValue() ?? this.x;
        this.puff = 0;
        this.redraw(-1);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
  }
}
