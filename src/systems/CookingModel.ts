// 익힘 FSM 순수 모델 (GDD §6.2, M0 스펙 §6).
// 상태는 doneness(유효 조리 시간, 초 = Σ dt × 열원계수)에서 파생된다 — 단방향, 역행 없음, 비교는 전부 ≥.
import { COOK, type CookThresholds } from '../data/balance';

export const COOK_STATES = ['RAW', 'SET', 'PERFECT_WINDOW', 'OVERDONE', 'BURNT', 'SMOKE'] as const;
export type CookState = (typeof COOK_STATES)[number];

/** doneness → 상태 파생 (닫힌 하한 `≥` 통일) */
export function donenessToState(doneness: number, cfg: CookThresholds = COOK): CookState {
  if (doneness >= cfg.SMOKE_AT) return 'SMOKE';
  if (doneness >= cfg.BURNT_AT) return 'BURNT';
  if (doneness >= cfg.PERFECT_END) return 'OVERDONE';
  if (doneness >= cfg.PERFECT_START) return 'PERFECT_WINDOW';
  if (doneness >= cfg.SET_AT) return 'SET';
  return 'RAW';
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export class CookingModel {
  private _doneness = 0;
  private _smokeElapsed = 0;
  private _smokeCriticalFired = false;

  constructor(private readonly cfg: CookThresholds = COOK) {}

  get doneness(): number {
    return this._doneness;
  }

  get state(): CookState {
    return donenessToState(this._doneness, this.cfg);
  }

  /** SMOKE 진입 후 실시간 경과(초) — 열원 계수 무관 (ADR-0005) */
  get smokeElapsed(): number {
    return this._smokeElapsed;
  }

  /** SMOKE 유예(SPRINKLER_DELAY) 경과로 경고가 발화되었는가 — 한 번 true면 유지 */
  get smokeCriticalFired(): boolean {
    return this._smokeCriticalFired;
  }

  /** 현재 상태 구간 내 진행도 0~1 (색 보간용). SMOKE는 유예 시간 대비 진행도 */
  get progressInState(): number {
    const c = this.cfg;
    const d = this._doneness;
    switch (this.state) {
      case 'RAW':
        return clamp01(d / c.SET_AT);
      case 'SET':
        return clamp01((d - c.SET_AT) / (c.PERFECT_START - c.SET_AT));
      case 'PERFECT_WINDOW':
        return clamp01((d - c.PERFECT_START) / (c.PERFECT_END - c.PERFECT_START));
      case 'OVERDONE':
        return clamp01((d - c.PERFECT_END) / (c.BURNT_AT - c.PERFECT_END));
      case 'BURNT':
        return clamp01((d - c.BURNT_AT) / (c.SMOKE_AT - c.BURNT_AT));
      case 'SMOKE':
        return clamp01(this._smokeElapsed / c.SPRINKLER_DELAY);
    }
  }

  /**
   * 한 틱 진행. 이번 틱에 지나간 **전이 목록**을 순서대로 반환한다
   * — 큰 dt로 다중 임계를 통과해도 중간 상태가 유실되지 않는다.
   * `heatCoeff = 0`이면 doneness 정지(M5 "불 끄기" 대비). SMOKE 유예는 실시간 가산.
   */
  update(dtSec: number, heatCoeff: number): CookState[] {
    if (dtSec <= 0 || !Number.isFinite(dtSec)) return [];
    const coeff = Math.max(0, heatCoeff);
    const before = this.state;

    this._doneness += dtSec * coeff;
    const after = this.state;

    // SMOKE 유예 — 실시간(dt) 기준. 이번 틱에 진입했다면 진입 이후 경과분만 가산한다.
    if (before === 'SMOKE') {
      this._smokeElapsed += dtSec;
    } else if (after === 'SMOKE') {
      const overshoot = coeff > 0 ? (this._doneness - this.cfg.SMOKE_AT) / coeff : 0;
      this._smokeElapsed += Math.min(dtSec, Math.max(0, overshoot));
    }
    if (!this._smokeCriticalFired && this._smokeElapsed >= this.cfg.SPRINKLER_DELAY) {
      this._smokeCriticalFired = true;
    }

    const transitions: CookState[] = [];
    for (let i = COOK_STATES.indexOf(before) + 1; i <= COOK_STATES.indexOf(after); i++) {
      transitions.push(COOK_STATES[i]!);
    }
    return transitions;
  }
}
