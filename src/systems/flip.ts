// 뒤집기 — 왕복 파워 게이지 + 판정 (GDD §6.3). 순수.
import { FLIP } from '../data/balance';
import type { CookState } from './CookingModel';

export interface Sweetspot {
  readonly lo: number;
  readonly hi: number;
}

/** 왕복 삼각파 게이지 — 홀드 시간 → 값 0→1→0 반복 */
export class PowerGauge {
  constructor(private readonly periodSec: number = FLIP.periodSec) {}

  /** heldSec 시점의 게이지 값 [0, 1] */
  valueAt(heldSec: number): number {
    if (!Number.isFinite(heldSec) || heldSec <= 0) return 0;
    const t = (heldSec / this.periodSec) % 1; // [0, 1)
    return t < 0.5 ? t * 2 : (1 - t) * 2; // 0→1→0
  }
}

export type FlipOutcome = 'PROJECTILE' | 'CLEAN' | 'HALF_FOLD' | 'FLEW_OFF' | 'BURNT_FLIP';

/**
 * (릴리즈 순간 익힘 상태, 게이지 값 p, 스윗스팟) → 판정 (GDD §6.3 표).
 * - RAW: 발사체
 * - SET / PERFECT_WINDOW: p<lo 반접힘 / p∈[lo,hi] 클린 / p>hi 이탈
 * - OVERDONE / BURNT / SMOKE: 까만 뒷면(분노)
 */
export function judgeFlip(state: CookState, p: number, sweetspot: Sweetspot = FLIP.sweetspot): FlipOutcome {
  switch (state) {
    case 'RAW':
      return 'PROJECTILE';
    case 'SET':
    case 'PERFECT_WINDOW':
      if (p < sweetspot.lo) return 'HALF_FOLD';
      if (p > sweetspot.hi) return 'FLEW_OFF';
      return 'CLEAN';
    case 'OVERDONE':
    case 'BURNT':
    case 'SMOKE':
      return 'BURNT_FLIP';
  }
}
