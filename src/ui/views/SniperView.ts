import Phaser from 'phaser';
import { ANCHORS, DEPTH, DESIGN, EVENT_BAR, SNIPER, toPx } from '../../data/layout';
import { SNIPER_STYLE, TELEGRAPH_STYLE } from '../../data/palette';
import type { EventInstance } from '../../systems/eventInstance';
import type { EnemyView } from './EnemyView';
import { OUTLINE, darken, drawBody2Tone, drawEye, drawOpenSmile } from './charKit';

/**
 * 저격수 (GDD §8.1 ⑤) — 상단 밖에서 팬을 조준.
 * 전조: 레이저 스윕(조준). 윈도우: 락온 빔(펜싱칼 탭으로 패링/반사).
 * 함정(DECISION-04): 빔을 직접 탭하면 +1 증원(최대 3) → 실패 시 구멍이 더 많이.
 * 성공: 반사(초록). 실패: 빔이 팬으로 꽂혀 후라이에 구멍(씬 처리). 팬은 방탄.
 * 디자인 v3: 2톤 헤드에 drawEye 외눈 스코프(조준 중엔 두리번, 락온 시 응시,
 * 패링당하면 눈이 핑 돈다) + 끝에 방울 달린 삐죽 안테나 + 진지함과 안 어울리는 해맑은 입(유머).
 */
export class SniperView implements EnemyView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly panPos = toPx(ANCHORS.pan);
  private readonly headY = DESIGN.height * SNIPER.yRatio;
  private readonly targetY = DESIGN.height * SNIPER.targetYRatio;
  private phase: 'aim' | 'lock' | 'done' = 'aim';
  private aimT = 0;
  private barFill = -1;
  private resolvedColor: number | null = null;
  /** 증식 수 (1..maxMultiply) */
  multiplier = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onTrap: () => void,
  ) {
    this.g = scene.add.graphics().setDepth(DEPTH.enemy);
    const midY = (this.headY + this.targetY) / 2;
    this.zone = scene.add
      .zone(DESIGN.width / 2, midY, 160, this.targetY - this.headY)
      .setDepth(DEPTH.enemy)
      .setInteractive({ useHandCursor: true });
    this.zone.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => {
        e?.stopPropagation?.();
        this.onTrap(); // 빔 직접 탭 = 함정(증원)
      },
    );
  }

  /** 함정 발동 — 빔 하나 추가 (상한 초과 시 무시하고 false) */
  addBeam(): boolean {
    if (this.multiplier >= SNIPER.maxMultiply) return false;
    this.multiplier++;
    this.resizeZone();
    this.scene.cameras.main.shake(120, 0.006);
    return true;
  }

  private resizeZone(): void {
    const spread = DESIGN.width * SNIPER.multiplyGapRatio * (this.multiplier - 1);
    this.zone.setSize(160 + spread, this.targetY - this.headY);
  }

  private headXs(): number[] {
    const cx = DESIGN.width / 2;
    const gap = DESIGN.width * SNIPER.multiplyGapRatio;
    const xs: number[] = [];
    for (let i = 0; i < this.multiplier; i++) {
      xs.push(cx + (i - (this.multiplier - 1) / 2) * gap);
    }
    return xs;
  }

  update(inst: EventInstance): void {
    if (this.phase === 'done') return;
    if (inst.phase === 'TELEGRAPH') {
      this.phase = 'aim';
      this.aimT = inst.phaseProgress01;
      this.barFill = -1;
    } else {
      this.phase = 'lock';
      this.barFill = 1 - inst.phaseProgress01;
    }
    this.redraw();
  }

  private redraw(): void {
    const g = this.g;
    g.clear();
    const locked = this.phase === 'lock' || this.resolvedColor !== null;
    const beamCol = this.resolvedColor ?? (locked ? SNIPER_STYLE.lock : SNIPER_STYLE.aim);
    const xs = this.headXs();
    const hr = SNIPER.headR;
    for (const hx of xs) {
      // 조준점(팬) — 스윕 시 좌우로 흔들리다 락온 시 팬 중앙 고정
      const tx =
        this.phase === 'aim'
          ? this.panPos.x + Math.sin(this.aimT * Math.PI * 4) * DESIGN.width * 0.14
          : this.panPos.x;
      // 빔
      if (locked) {
        g.lineStyle(SNIPER.beamW, beamCol, 0.95);
        g.lineBetween(hx, this.headY, tx, this.targetY);
        g.fillStyle(beamCol, 0.5);
        g.fillCircle(tx, this.targetY, 10);
      } else {
        // 조준 점선
        g.lineStyle(2, SNIPER_STYLE.aim, 0.7);
        const seg = 14;
        for (let i = 0; i < seg; i += 2) {
          const t0 = i / seg;
          const t1 = (i + 1) / seg;
          g.lineBetween(
            hx + (tx - hx) * t0,
            this.headY + (this.targetY - this.headY) * t0,
            hx + (tx - hx) * t1,
            this.headY + (this.targetY - this.headY) * t1,
          );
        }
      }
      // 삐죽 안테나 — 끝 방울은 락온 시 빨갛게 (헤드 뒤에 먼저 그린다)
      const ax = hx + hr * 0.3;
      const ay = this.headY - hr * 1.6;
      g.lineStyle(4, OUTLINE.color, 1);
      g.lineBetween(hx + hr * 0.1, this.headY - hr * 0.8, ax, ay);
      g.fillStyle(locked ? SNIPER_STYLE.lock : SNIPER_STYLE.scope, 1);
      g.fillCircle(ax, ay, 5);
      g.lineStyle(3, OUTLINE.color, 1);
      g.strokeCircle(ax, ay, 5);
      // 저격수 헤드 — 2톤 + 외곽선
      drawBody2Tone(g, hx, this.headY, hr * 2, hr * 2, SNIPER_STYLE.body);
      // 외눈 스코프 — 금속 링 + drawEye(흰자+동공+글린트 렌즈)
      g.fillStyle(darken(SNIPER_STYLE.body, 0.6), 1);
      g.fillCircle(hx, this.headY, hr * 0.62);
      g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
      g.strokeCircle(hx, this.headY, hr * 0.62);
      // 조준 중엔 타깃을 따라 두리번, 락온 시 정면 응시, 패링당하면 눈이 핑 돈다
      const lookX = this.phase === 'aim' ? Math.sin(this.aimT * Math.PI * 4) * 0.45 : 0;
      const lookY = this.resolvedColor === SNIPER_STYLE.reflect ? -0.45 : 0.35;
      drawEye(g, hx, this.headY, hr * 0.4, lookX, lookY);
      // 렌즈 글로우 링 — 락온 시 스코프색으로 반짝
      g.lineStyle(3, SNIPER_STYLE.scope, locked ? 0.9 : 0.45);
      g.strokeCircle(hx, this.headY, hr * 0.52);
      // 진지한 조준과 안 어울리는 해맑은 입 (유머)
      drawOpenSmile(g, hx, this.headY + hr * 0.7, 11);
    }
    // 락온 전조 바 (첫 헤드 위)
    if (this.barFill >= 0) {
      const bx = xs[0]!;
      const barY = this.headY - SNIPER.headR - EVENT_BAR.abovePx * 0.5;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(bx - EVENT_BAR.w / 2, barY, EVENT_BAR.w, EVENT_BAR.h);
      g.fillStyle(TELEGRAPH_STYLE.warn, 1);
      g.fillRect(bx - EVENT_BAR.w / 2, barY, EVENT_BAR.w * this.barFill, EVENT_BAR.h);
    }
  }

  playResolve(result: 'success' | 'fail', onDone: () => void): void {
    this.phase = 'done';
    this.resolvedColor = result === 'success' ? SNIPER_STYLE.reflect : SNIPER_STYLE.lock;
    this.redraw();
    // 성공: 초록 반사 번쩍 후 퇴장 / 실패: 붉은 빔 임팩트(구멍은 씬)
    if (result === 'fail') this.scene.cameras.main.shake(160, 0.01);
    this.scene.tweens.addCounter({
      from: 1,
      to: 0,
      duration: 300,
      onUpdate: (tw) => {
        this.g.setAlpha(tw.getValue() ?? 1);
      },
      onComplete: onDone,
    });
  }

  destroy(): void {
    this.g.destroy();
    this.zone.destroy();
  }
}
