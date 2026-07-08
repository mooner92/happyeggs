import { describe, expect, it } from 'vitest';
import { STAGES } from '../data/stages';
import { validateStage, type StageDef } from './stageDef';

function def(over: Partial<StageDef> = {}): StageDef {
  return {
    id: 'stage_x',
    background: 'kitchen_day',
    heatSource: 'gas',
    customers: 4,
    orderRange: [1, 2],
    panCapacity: 2,
    eggStock: 10,
    enemyPool: [],
    eventBudget: 2,
    starThresholds: [80, 90, 96],
    ...over,
  };
}

describe('validateStage', () => {
  it('정상 정의는 통과', () => {
    expect(validateStage(def())).toBeNull();
  });
  it('데이터 스테이지 전부 유효', () => {
    for (const s of STAGES) expect(validateStage(s)).toBeNull();
  });
  it('customers 0 거부', () => {
    expect(validateStage(def({ customers: 0 }))).toMatch(/customers/);
  });
  it('orderRange 역전 거부', () => {
    expect(validateStage(def({ orderRange: [3, 1] }))).toMatch(/orderRange/);
  });
  it('orderMax > panCapacity 거부', () => {
    expect(validateStage(def({ orderRange: [1, 3], panCapacity: 2 }))).toMatch(/panCapacity/);
  });
  it('eggStock이 최소 주문 총합 미만이면 거부', () => {
    expect(validateStage(def({ customers: 5, orderRange: [2, 2], eggStock: 5 }))).toMatch(/eggStock/);
  });
  it('starThresholds 비오름차순 거부', () => {
    expect(validateStage(def({ starThresholds: [90, 80, 96] }))).toMatch(/starThresholds/);
  });
});
