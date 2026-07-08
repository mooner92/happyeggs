// 원형도 채점 (GDD §6.4) — 이 게임 점수의 심장. 순수 함수, 유닛테스트 필수.
import { polygonArea, polygonPerimeter, type Vec2 } from './geometry';

/**
 * 등주부등식 지수 Q_eff = 4π·A_eff / P_eff² (완벽한 원 = 1.0).
 * 구멍(총알): A_eff = A − ΣA_hole, P_eff = P + ΣP_hole → 자연 감점.
 * 반토막(거미): 남은 폴리곤을 outline으로 그대로 넘긴다.
 * 반환은 [0, ∞) 이론상이나 실제 폴리곤에서 ≤ 1 근방. P_eff ≤ 0이면 0.
 */
export function circularity(outline: readonly Vec2[], holes: readonly (readonly Vec2[])[] = []): number {
  let area = polygonArea(outline);
  let perim = polygonPerimeter(outline);
  for (const hole of holes) {
    area -= polygonArea(hole);
    perim += polygonPerimeter(hole);
  }
  if (perim <= 0 || area <= 0) return 0;
  return (4 * Math.PI * area) / (perim * perim);
}

/** Q → 소수점 3자리 점수. `floor(q×100×1000)/1000` (반올림 아님, GDD §6.4). 음수 방어 0. */
export function scoreFromQ(q: number): number {
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.floor(q * 100 * 1000) / 1000;
}

/** "97.412" 형식 문자열 (항상 소수점 3자리) */
export function formatScore(score: number): string {
  return score.toFixed(3);
}

/** 스테이지 점수 = 서빙 성공한 계란 점수 평균 (소수점 3자리 floor). 빈 배열이면 0. */
export function stageAverage(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.floor(mean * 1000) / 1000;
}
