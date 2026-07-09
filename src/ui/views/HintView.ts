import Phaser from 'phaser';
import { DEPTH, HINT } from '../../data/layout';
import { HINT_STYLE } from '../../data/palette';

/** 조작 동사 힌트 종류 — 탭(깨기) · 홀드(뒤집기) · 위 스와이프(서빙) · 밀기(흰자 모으기) */
export type HintVerb = 'crack' | 'flip' | 'serve' | 'push';

/**
 * 무자막 조작 힌트 (구체화 패스, Bacon 톤 — 글자 없이 픽토그램만).
 * crack=탭 물결, flip=홀드 게이지(차오르는 파이), serve=튀는 위 화살표.
 * 각 동사는 첫 성공까지만 노출(씬이 결정) — 매 프레임 재드로우(도형 ≤5개).
 */
export class HintView {
  private readonly g: Phaser.GameObjects.Graphics;
  private verb: HintVerb | null = null;
  private x = 0;
  private y = 0;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.gauge - 1);
  }

  show(verb: HintVerb, x: number, y: number): void {
    this.verb = verb;
    this.x = x;
    this.y = y;
  }

  hide(): void {
    if (this.verb === null) return;
    this.verb = null;
    this.g.clear();
  }

  update(timeMs: number): void {
    if (this.verb === null) return;
    const g = this.g;
    const r = HINT.r;
    g.clear();
    switch (this.verb) {
      case 'crack': {
        // 탭 물결 — 중심 점 + 퍼지는 링 2개
        const phase = (timeMs % 900) / 900;
        g.fillStyle(HINT_STYLE.icon, 0.95);
        g.fillCircle(this.x, this.y, 9);
        for (const off of [0, 0.45]) {
          const p = (phase + off) % 1;
          g.lineStyle(4, HINT_STYLE.icon, 0.8 * (1 - p));
          g.strokeCircle(this.x, this.y, 12 + p * r * 1.6);
        }
        break;
      }
      case 'flip': {
        // 홀드 게이지 — 바깥 링 + 시계방향으로 차오르는 파이
        const p = (timeMs % 1400) / 1400;
        g.lineStyle(4, HINT_STYLE.icon, 0.9);
        g.strokeCircle(this.x, this.y, r);
        g.fillStyle(HINT_STYLE.accent, 0.85);
        g.slice(this.x, this.y, r - 8, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false);
        g.fillPath();
        break;
      }
      case 'push': {
        // 불룩한 흰자 밀기 — 지점에 작은 탭 물결 (accent 색으로 crack과 구분)
        const phase = (timeMs % 700) / 700;
        g.fillStyle(HINT_STYLE.accent, 0.95);
        g.fillCircle(this.x, this.y, 7);
        const p = phase;
        g.lineStyle(4, HINT_STYLE.accent, 0.85 * (1 - p));
        g.strokeCircle(this.x, this.y, 10 + p * r * 1.2);
        break;
      }
      case 'serve': {
        // 위 화살표 — 통통 튀며 위를 가리킴
        const bounce = Math.abs(Math.sin(timeMs / 260)) * 14;
        const y = this.y - bounce;
        g.fillStyle(HINT_STYLE.accent, 0.95);
        g.fillTriangle(this.x - r * 0.8, y, this.x + r * 0.8, y, this.x, y - r * 1.1);
        g.fillRect(this.x - 7, y, 14, r * 0.9);
        break;
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
