import { describe, expect, it } from 'vitest';
import { type Vec2 } from './geometry';
import { circularity, formatScore, scoreFromQ, stageAverage } from './scoring';

function regularPolygon(n: number, r: number, cx = 0, cy = 0): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

describe('circularity Q = 4πA/P²', () => {
  it('완벽에 가까운 원(정64각형)은 Q ≈ 1', () => {
    const q = circularity(regularPolygon(64, 50));
    expect(q).toBeGreaterThan(0.99);
    expect(q).toBeLessThanOrEqual(1);
  });

  it('정사각형은 Q = π/4 ≈ 0.785', () => {
    const sq: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(circularity(sq)).toBeCloseTo(Math.PI / 4, 6);
  });

  it('반토막(반원 근사)은 온전한 원보다 Q가 폭락한다', () => {
    const full = circularity(regularPolygon(64, 50));
    // 위쪽 절반 정점 + 지름 밑변 → 반원꼴
    const half = regularPolygon(64, 50).filter((p) => p.y >= 0);
    expect(circularity(half)).toBeLessThan(full * 0.85);
  });

  it('구멍이 있으면 A_eff↓·P_eff↑로 Q가 내려간다', () => {
    const outline = regularPolygon(64, 50);
    const base = circularity(outline);
    const oneHole = circularity(outline, [regularPolygon(16, 6, 10, 0)]);
    const twoHoles = circularity(outline, [
      regularPolygon(16, 6, 10, 0),
      regularPolygon(16, 6, -12, 8),
    ]);
    expect(oneHole).toBeLessThan(base);
    expect(twoHoles).toBeLessThan(oneHole);
  });

  it('융합(넓은 덩어리)도 유한한 Q를 낸다', () => {
    // 두 원이 겹친 듯 가로로 긴 캡슐꼴 — 폴리곤 하나로
    const blob: Vec2[] = regularPolygon(64, 40).map((p) => ({ x: p.x * 1.8, y: p.y }));
    const q = circularity(blob);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(0.95); // 원보다 낮다
  });

  it('퇴화 입력은 0', () => {
    expect(circularity([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(0);
    expect(circularity([])).toBe(0);
  });
});

describe('scoreFromQ / format', () => {
  it('floor 절사 — 반올림 아님 ("97.412")', () => {
    expect(scoreFromQ(0.974129)).toBe(97.412); // 97.4129 → floor 97.412
    expect(formatScore(scoreFromQ(0.974129))).toBe('97.412');
  });

  it('Q=1이면 100.000이지만 실제 폴리곤은 1 미만이라 도달 불가(의도)', () => {
    expect(scoreFromQ(1)).toBe(100);
    // 정256각형도 100 미만
    const q = circularity(regularPolygon(256, 50));
    expect(scoreFromQ(q)).toBeLessThan(100);
  });

  it('음수/비유한 Q는 0', () => {
    expect(scoreFromQ(-1)).toBe(0);
    expect(scoreFromQ(NaN)).toBe(0);
  });
});

describe('stageAverage', () => {
  it('평균을 소수점 3자리로 floor', () => {
    expect(stageAverage([90, 80, 85])).toBe(85); // 정확
    expect(stageAverage([97.412, 88.9])).toBe(93.156); // (97.412+88.9)/2=93.156
  });
  it('빈 배열은 0', () => {
    expect(stageAverage([])).toBe(0);
  });
});
