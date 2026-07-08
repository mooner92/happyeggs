import { describe, expect, it } from 'vitest';
import { StageSession } from './stage';
import type { Order } from './orders';

const orders: Order[] = [{ eggCount: 2 }, { eggCount: 1 }, { eggCount: 2 }];

describe('StageSession', () => {
  it('초기 상태 PLAYING, 현재 주문·재고·손님수', () => {
    const s = new StageSession(orders, 4, 8);
    expect(s.status).toBe('PLAYING');
    expect(s.currentOrder?.eggCount).toBe(2);
    expect(s.remainingStock).toBe(8);
    expect(s.customersLeft).toBe(3);
  });

  it('전원 서빙하면 CLEARED + 평균 점수', () => {
    const s = new StageSession(orders, 4, 8);
    s.serveCurrent([90, 80]);
    s.serveCurrent([100]);
    expect(s.status).toBe('PLAYING');
    s.serveCurrent([95, 85]);
    expect(s.status).toBe('CLEARED');
    // 평균 = (90+80+100+95+85)/5 = 90
    expect(s.averageScore).toBe(90);
  });

  it('계란 소모가 재고를 줄이고, 재고 부족 시 FAILED (GDD §6.5)', () => {
    // 주문 총 5개인데 재고 4 → 이미 데드락
    const s = new StageSession(orders, 4, 4);
    expect(s.isDeadlocked).toBe(true);
    expect(s.status).toBe('FAILED');
    expect(s.failReason).toBe('deadlock');
  });

  it('소모로 재고가 남은 주문보다 적어지면 FAILED', () => {
    const s = new StageSession(orders, 4, 6); // 주문 5, 여유 1
    expect(s.status).toBe('PLAYING');
    s.consumeEgg(2); // 재고 4 < 남은 주문 5 → 데드락
    expect(s.status).toBe('FAILED');
  });

  it('주문 실패는 자기 주문 수만큼 재고 도난 + 다음 손님 (GDD §6.3)', () => {
    const s = new StageSession(orders, 4, 10);
    s.failCurrent(); // 첫 손님 주문 2개 도난
    expect(s.remainingStock).toBe(8);
    expect(s.failedCount).toBe(1);
    expect(s.currentOrder?.eggCount).toBe(1); // 다음 손님
  });

  it('forceFail(smoke)은 즉시 FAILED', () => {
    const s = new StageSession(orders, 4, 10);
    s.forceFail('smoke');
    expect(s.status).toBe('FAILED');
    expect(s.failReason).toBe('smoke');
  });

  it('consumeEgg는 재고 없으면 false', () => {
    const s = new StageSession([{ eggCount: 1 }], 4, 1);
    expect(s.consumeEgg()).toBe(true);
    expect(s.consumeEgg()).toBe(false);
  });

  it('hardcoded 팩토리 — eggStock = 주문 총합 + 여유분', () => {
    // randomInt를 항상 2 반환으로 고정 → 3손님 × 2 = 6, 여유 3 → 재고 9
    const s = StageSession.hardcoded(3, 1, 3, 3, 4, () => 2);
    expect(s.customersLeft).toBe(3);
    expect(s.remainingStock).toBe(9);
    expect(s.currentOrder?.eggCount).toBe(2);
  });
});

describe('StageSession.fromDef (GDD §10)', () => {
  it('eggStock=def.eggStock, 주문 def.customers개·범위 내, getter 반영', () => {
    const def = {
      id: 'stage_t',
      background: 'kitchen_day',
      heatSource: 'brazier' as const,
      customers: 4,
      orderRange: [1, 2] as [number, number],
      panCapacity: 2,
      eggStock: 11,
      enemyPool: ['ninja_spider'],
      eventBudget: 3,
      starThresholds: [80, 90, 96] as [number, number, number],
    };
    let s = 7;
    const rnd = (min: number, max: number) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return min + (s % (max - min + 1));
    };
    const sess = StageSession.fromDef(def, 4, rnd);
    expect(sess.remainingStock).toBe(11);
    expect(sess.customersLeft).toBe(4);
    expect(sess.def?.heatSource).toBe('brazier');
    expect(sess.def?.enemyPool).toEqual(['ninja_spider']);
    // 모든 주문이 orderRange 내
    for (const o of sess.visibleOrders) {
      expect(o.eggCount).toBeGreaterThanOrEqual(1);
      expect(o.eggCount).toBeLessThanOrEqual(2);
    }
  });
});
