// 계란 재고 (GDD §6.5) — 깨기/로스트/도난 모두 차감. 단일 소유, 이벤트로만 갱신. 순수.

export class Inventory {
  private _stock: number;

  constructor(initialStock: number) {
    this._stock = Math.max(0, Math.floor(initialStock));
  }

  get remainingStock(): number {
    return this._stock;
  }

  /** n개 차감 — 재고 이하로만, 실제 차감량 반환 (0 미만 방어) */
  consume(n = 1): number {
    if (n <= 0) return 0;
    const taken = Math.min(this._stock, Math.floor(n));
    this._stock -= taken;
    return taken;
  }
}

/**
 * 진행 불가(즉시 실패) 판정 (GDD §6.5):
 * 남은 재고가 남은 주문 총량보다 적으면 완료 불가 → 실패.
 */
export function isDeadlocked(remainingStock: number, remainingOrderEggs: number): boolean {
  return remainingStock < remainingOrderEggs;
}
