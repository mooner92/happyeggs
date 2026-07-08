// 폴리곤 기하 — 원형도 채점(GDD §6.4)과 블롭 검증 공용. 순수 함수.

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** 다각형 넓이 (shoelace, 절대값 — 정점 방향 무관) */
export function polygonArea(pts: readonly Vec2[]): number {
  const n = pts.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** 다각형 둘레 (닫힌 경로) */
export function polygonPerimeter(pts: readonly Vec2[]): number {
  const n = pts.length;
  if (n < 2) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}
