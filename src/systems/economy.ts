// 코인 경제 (GDD §12 BM 스캐폴드, ADR-0011) — 순수 함수. 서빙 점수 → 코인(기본급 + 팁).
import { COIN, REACTION } from '../data/balance';

/** 서빙 리액션 종류 — 하트(감동) / 별(만족) / 분노 */
export type ReactionKind = 'love' | 'ok' | 'angry';

/** 계란 1개 점수 → 코인 (기본급 + 팁 구간 첫 매칭) */
export function coinsForScore(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  let tip = 0;
  for (const t of COIN.tips) {
    if (score >= t.min) {
      tip = t.coins;
      break;
    }
  }
  return COIN.basePay + tip;
}

/** 서빙 점수 묶음 → 총 코인 */
export function coinsForServe(scores: readonly number[]): number {
  return scores.reduce((sum, s) => sum + coinsForScore(s), 0);
}

/** 서빙 평균 점수 → 손님 리액션 (GPGP식 표정 피드백) */
export function reactionForAverage(avg: number): ReactionKind {
  if (avg >= REACTION.love) return 'love';
  if (avg >= REACTION.ok) return 'ok';
  return 'angry';
}
