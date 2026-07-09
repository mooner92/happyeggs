import Phaser from 'phaser';
import { DEBUG } from '../data/balance';
import { ANCHORS, TEXT, toPx } from '../data/layout';
import { HUD_TEXT } from '../data/palette';
import type { CookingModel } from '../systems/CookingModel';
import { bus } from '../systems/events';
import type { Unsubscribe } from '../systems/EventBus';

/** HUD가 읽는 계란 정보 — 씬의 EggEntity와 구조적으로 호환 (ui→scenes 역참조 방지) */
export interface HudEggInfo {
  readonly id: number;
  readonly cooking: CookingModel;
}

/**
 * 디버그 HUD — 계란별 상태/doneness/타이머 + fps (M0 인수 확인용).
 * setText는 HUD_INTERVAL_MS 주기 + 내용 변경 시에만 호출한다(텍스처 재업로드 비용 방지).
 * 표시 여부: 쿼리 파라미터 `?debug=0`으로만 끈다 — M0는 기본 ON (스펙 as-built 참조).
 */
export class DebugHud {
  private readonly text: Phaser.GameObjects.Text;
  private readonly unsubs: Unsubscribe[] = [];
  private readonly smokeCritical = new Set<number>();
  private accMs = 0;
  private lastContent = '';

  constructor(
    scene: Phaser.Scene,
    /** 계란 id → 현재 원형도 Q (ADR-0012 튜닝/QA) — 250ms 스로틀 안에서만 호출(할당 예산) */
    private readonly qOf?: (id: number) => number | undefined,
  ) {
    const origin = toPx(ANCHORS.hudOrigin);
    this.text = scene.add
      .text(origin.x, origin.y, '', {
        fontFamily: 'monospace',
        fontSize: TEXT.hudSize,
        color: HUD_TEXT.normal,
        lineSpacing: 6,
      })
      .setDepth(1000);

    this.unsubs.push(
      bus.on('cook:smokeCritical', ({ eggId }) => this.smokeCritical.add(eggId)),
    );
  }

  update(deltaMs: number, eggs: readonly HudEggInfo[], fps: number): void {
    this.accMs += deltaMs;
    if (this.accMs < DEBUG.HUD_INTERVAL_MS) return;
    this.accMs = 0;

    const lines = [`fps ${fps.toFixed(0)} | eggs ${eggs.length}/${DEBUG.MAX_EGGS}`];
    let warning = false;
    for (const egg of eggs) {
      const c = egg.cooking;
      let line = `#${egg.id} ${c.state} d=${c.doneness.toFixed(2)} p=${c.progressInState.toFixed(2)}`;
      const q = this.qOf?.(egg.id);
      if (q !== undefined) line += ` Q=${q.toFixed(3)}`;
      if (c.state === 'SMOKE') line += ` smoke=${c.smokeElapsed.toFixed(1)}s`;
      if (this.smokeCritical.has(egg.id)) {
        line += ' !! SPRINKLER (M3)';
        warning = true;
      }
      lines.push(line);
    }

    const content = lines.join('\n');
    if (content === this.lastContent) return;
    this.lastContent = content;
    this.text.setColor(warning ? HUD_TEXT.warning : HUD_TEXT.normal);
    this.text.setText(content);
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.text.destroy();
  }
}
