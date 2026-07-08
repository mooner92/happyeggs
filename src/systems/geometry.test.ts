import { describe, expect, it } from 'vitest';
import { polygonArea, polygonPerimeter, type Vec2 } from './geometry';

/** 반지름 r, n각형 정점 (반시계) */
function regularPolygon(n: number, r: number, cx = 0, cy = 0): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

describe('geometry', () => {
  it('삼각형 넓이 (shoelace)', () => {
    const tri: Vec2[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    expect(polygonArea(tri)).toBeCloseTo(6, 9);
  });

  it('단위정사각형 넓이 1·둘레 4', () => {
    const sq: Vec2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonArea(sq)).toBeCloseTo(1, 9);
    expect(polygonPerimeter(sq)).toBeCloseTo(4, 9);
  });

  it('정점 방향(시계/반시계) 무관 — 절대값', () => {
    const ccw = regularPolygon(5, 10);
    const cw = [...ccw].reverse();
    expect(polygonArea(cw)).toBeCloseTo(polygonArea(ccw), 9);
  });

  it('정n각형이 원 넓이/둘레로 수렴한다', () => {
    const r = 10;
    const big = regularPolygon(256, r);
    expect(polygonArea(big)).toBeCloseTo(Math.PI * r * r, 1);
    expect(polygonPerimeter(big)).toBeCloseTo(2 * Math.PI * r, 1);
  });

  it('정점 3개 미만은 넓이 0', () => {
    expect(polygonArea([{ x: 0, y: 0 }])).toBe(0);
    expect(polygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});
