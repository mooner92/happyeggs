import { describe, expect, it } from 'vitest';
import { starsFor } from './stars';

const TH: [number, number, number] = [80, 90, 96];

describe('starsFor', () => {
  it('임계 미만은 0', () => {
    expect(starsFor(79.999, TH)).toBe(0);
  });
  it('경계값 포함(≥)', () => {
    expect(starsFor(80, TH)).toBe(1);
    expect(starsFor(90, TH)).toBe(2);
    expect(starsFor(96, TH)).toBe(3);
  });
  it('구간별 별 수', () => {
    expect(starsFor(85, TH)).toBe(1);
    expect(starsFor(93, TH)).toBe(2);
    expect(starsFor(99, TH)).toBe(3);
  });
  it('평균이 오를수록 별은 단조 증가', () => {
    let prev = 0;
    for (let a = 70; a <= 100; a += 1) {
      const s = starsFor(a, TH);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});
