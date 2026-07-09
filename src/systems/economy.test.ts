// 코인 경제 (ADR-0011) — 기본급+팁 구간, 리액션 임계. 순수.
import { describe, expect, it } from 'vitest';
import { COIN, REACTION } from '../data/balance';
import { coinsForScore, coinsForServe, reactionForAverage } from './economy';

describe('coinsForScore', () => {
  it('팁 구간 — 95+/85+/70+/미만 순 매칭', () => {
    expect(coinsForScore(97)).toBe(COIN.basePay + 4);
    expect(coinsForScore(95)).toBe(COIN.basePay + 4);
    expect(coinsForScore(90)).toBe(COIN.basePay + 2);
    expect(coinsForScore(75)).toBe(COIN.basePay + 1);
    expect(coinsForScore(50)).toBe(COIN.basePay);
  });

  it('0 이하·비정상 값은 0', () => {
    expect(coinsForScore(0)).toBe(0);
    expect(coinsForScore(-10)).toBe(0);
    expect(coinsForScore(Number.NaN)).toBe(0);
    expect(coinsForScore(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('coinsForServe', () => {
  it('묶음 합산', () => {
    expect(coinsForServe([97, 50])).toBe(COIN.basePay + 4 + COIN.basePay);
    expect(coinsForServe([])).toBe(0);
  });
});

describe('reactionForAverage', () => {
  it('임계 — love(90+) / ok(70+) / angry', () => {
    expect(reactionForAverage(REACTION.love)).toBe('love');
    expect(reactionForAverage(89.9)).toBe('ok');
    expect(reactionForAverage(REACTION.ok)).toBe('ok');
    expect(reactionForAverage(69.9)).toBe('angry');
  });
});
