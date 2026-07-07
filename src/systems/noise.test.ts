import { describe, expect, it } from 'vitest';
import { createNoise1D } from './noise';

const SAMPLES = 500;
const STEP = 0.037; // 격자 경계를 다양하게 지나도록 비정수 간격

describe('createNoise1D', () => {
  it('동일 시드 = 동일 시퀀스 (결정론)', () => {
    const a = createNoise1D(42);
    const b = createNoise1D(42);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i * STEP;
      expect(a(t)).toBe(b(t));
    }
  });

  it('다른 시드는 다른 시퀀스를 낸다', () => {
    const a = createNoise1D(1);
    const b = createNoise1D(2);
    let differs = false;
    for (let i = 0; i < SAMPLES && !differs; i++) {
      differs = a(i * STEP) !== b(i * STEP);
    }
    expect(differs).toBe(true);
  });

  it('출력이 항상 [-1, 1] 범위다', () => {
    const n = createNoise1D(7);
    for (let i = -SAMPLES; i < SAMPLES; i++) {
      const v = n(i * STEP);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('연속적이다 — 인접 샘플 간 점프에 상한이 있다', () => {
    // smoothstep 보간의 최대 기울기 = 1.5 × |v1 − v0| ≤ 3 (격자 단위당)
    const n = createNoise1D(99);
    const eps = 1e-3;
    const bound = 3 * eps * 1.5; // 여유 계수 1.5
    for (let i = 0; i < SAMPLES; i++) {
      const t = i * STEP;
      expect(Math.abs(n(t + eps) - n(t))).toBeLessThanOrEqual(bound);
    }
  });
});
