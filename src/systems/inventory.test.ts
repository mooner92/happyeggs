import { describe, expect, it } from 'vitest';
import { Inventory, isDeadlocked } from './inventory';

describe('Inventory', () => {
  it('차감이 재고를 줄인다', () => {
    const inv = new Inventory(10);
    expect(inv.consume(3)).toBe(3);
    expect(inv.remainingStock).toBe(7);
  });

  it('재고 초과 차감은 남은 만큼만', () => {
    const inv = new Inventory(2);
    expect(inv.consume(5)).toBe(2);
    expect(inv.remainingStock).toBe(0);
    expect(inv.consume(1)).toBe(0);
  });

  it('0/음수 차감은 no-op', () => {
    const inv = new Inventory(5);
    expect(inv.consume(0)).toBe(0);
    expect(inv.consume(-3)).toBe(0);
    expect(inv.remainingStock).toBe(5);
  });

  it('기본 차감량은 1', () => {
    const inv = new Inventory(3);
    inv.consume();
    expect(inv.remainingStock).toBe(2);
  });
});

describe('isDeadlocked (GDD §6.5)', () => {
  it('재고 < 남은 주문 → 실패', () => {
    expect(isDeadlocked(2, 3)).toBe(true);
  });
  it('재고 == 남은 주문 → 아직 가능', () => {
    expect(isDeadlocked(3, 3)).toBe(false);
  });
  it('재고 > 남은 주문 → 여유', () => {
    expect(isDeadlocked(5, 3)).toBe(false);
  });
});
