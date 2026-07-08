import { describe, expect, it } from 'vitest';
import { CustomerQueue, type Order } from './orders';

const orders: Order[] = [{ eggCount: 2 }, { eggCount: 1 }, { eggCount: 2 }, { eggCount: 1 }, { eggCount: 3 }];

describe('CustomerQueue', () => {
  it('front는 맨 앞 손님, advance로 진행', () => {
    const q = new CustomerQueue(orders, 4);
    expect(q.front?.eggCount).toBe(2);
    q.advance();
    expect(q.front?.eggCount).toBe(1);
  });

  it('visible은 앞에서 visibleCount명만', () => {
    const q = new CustomerQueue(orders, 4);
    expect(q.visible.length).toBe(4);
    q.advance();
    q.advance();
    expect(q.visible.length).toBe(3); // 남은 3명
  });

  it('remaining / remainingEggs 집계', () => {
    const q = new CustomerQueue(orders, 4);
    expect(q.remaining).toBe(5);
    expect(q.remainingEggs).toBe(2 + 1 + 2 + 1 + 3);
    q.advance(); // 2개 주문 손님 처리
    expect(q.remainingEggs).toBe(1 + 2 + 1 + 3);
  });

  it('전원 소진 시 isEmpty·front=null', () => {
    const q = new CustomerQueue(orders, 4);
    for (let i = 0; i < orders.length; i++) q.advance();
    expect(q.isEmpty).toBe(true);
    expect(q.front).toBeNull();
    q.advance(); // 초과 진행 안전
    expect(q.remaining).toBe(0);
  });
});
