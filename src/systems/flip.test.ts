import { describe, expect, it } from 'vitest';
import { FLIP } from '../data/balance';
import type { CookState } from './CookingModel';
import { judgeFlip, PowerGauge, type Sweetspot } from './flip';

const SS: Sweetspot = FLIP.sweetspot;

describe('PowerGauge — 왕복 삼각파', () => {
  const g = new PowerGauge(1.0);
  it('0에서 시작, 반주기에 1(정점), 한 주기에 0으로 복귀', () => {
    expect(g.valueAt(0)).toBe(0);
    expect(g.valueAt(0.5)).toBeCloseTo(1, 9);
    expect(g.valueAt(1.0)).toBeCloseTo(0, 9);
  });
  it('1/4·3/4 지점은 0.5', () => {
    expect(g.valueAt(0.25)).toBeCloseTo(0.5, 9);
    expect(g.valueAt(0.75)).toBeCloseTo(0.5, 9);
  });
  it('여러 주기 왕복 — 값은 항상 [0,1]', () => {
    for (let i = 0; i < 400; i++) {
      const v = g.valueAt(i * 0.017);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('음수/0 홀드는 0', () => {
    expect(g.valueAt(-1)).toBe(0);
    expect(g.valueAt(0)).toBe(0);
  });
});

describe('judgeFlip — 판정표 전 분기 (GDD §6.3)', () => {
  it('RAW는 p와 무관하게 발사체', () => {
    for (const p of [0, 0.5, 0.8, 1]) {
      expect(judgeFlip('RAW', p, SS)).toBe('PROJECTILE');
    }
  });

  it.each(['SET', 'PERFECT_WINDOW'] as CookState[])('%s + 스윗스팟 안 → 클린', (s) => {
    expect(judgeFlip(s, SS.lo, SS)).toBe('CLEAN');
    expect(judgeFlip(s, (SS.lo + SS.hi) / 2, SS)).toBe('CLEAN');
    expect(judgeFlip(s, SS.hi, SS)).toBe('CLEAN');
  });

  it.each(['SET', 'PERFECT_WINDOW'] as CookState[])('%s + p 부족 → 반접힘', (s) => {
    expect(judgeFlip(s, SS.lo - 0.001, SS)).toBe('HALF_FOLD');
    expect(judgeFlip(s, 0, SS)).toBe('HALF_FOLD');
  });

  it.each(['SET', 'PERFECT_WINDOW'] as CookState[])('%s + p 과다 → 이탈', (s) => {
    expect(judgeFlip(s, SS.hi + 0.001, SS)).toBe('FLEW_OFF');
    expect(judgeFlip(s, 1, SS)).toBe('FLEW_OFF');
  });

  it.each(['OVERDONE', 'BURNT', 'SMOKE'] as CookState[])('%s → 까만 뒷면(분노)', (s) => {
    expect(judgeFlip(s, 0.8, SS)).toBe('BURNT_FLIP');
  });

  it('경계값 — lo/hi는 클린에 포함(닫힌 구간)', () => {
    expect(judgeFlip('SET', SS.lo, SS)).toBe('CLEAN');
    expect(judgeFlip('SET', SS.hi, SS)).toBe('CLEAN');
  });
});
