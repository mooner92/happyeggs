// 별점 (GDD §10·§11) — 스테이지 평균 점수를 임계와 비교해 별 0~3개. 순수.

export type Stars = 0 | 1 | 2 | 3;

/** 평균 점수 → 별 개수 (임계는 오름차순 [별1, 별2, 별3]) */
export function starsFor(average: number, thresholds: readonly [number, number, number]): Stars {
  if (average >= thresholds[2]) return 3;
  if (average >= thresholds[1]) return 2;
  if (average >= thresholds[0]) return 1;
  return 0;
}
