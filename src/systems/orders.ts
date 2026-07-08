// 손님 큐 / 주문 (GDD §7) — 대기열 3~4명 표시, 맨 앞만 활성, 인내심 타이머 없음. 순수.

export interface Order {
  /** 주문 계란 수 (말풍선 아이콘 × N) */
  readonly eggCount: number;
}

export class CustomerQueue {
  private index = 0;

  constructor(
    private readonly orders: readonly Order[],
    private readonly visibleCount: number,
  ) {}

  /** 맨 앞(활성) 손님의 주문 — 소진 시 null */
  get front(): Order | null {
    return this.orders[this.index] ?? null;
  }

  /** 화면에 보이는 대기열 (앞에서 visibleCount명) */
  get visible(): readonly Order[] {
    return this.orders.slice(this.index, this.index + this.visibleCount);
  }

  /** 남은 손님 수 */
  get remaining(): number {
    return this.orders.length - this.index;
  }

  /** 남은 주문 계란 총량 (재고 부족 판정용, GDD §6.5) */
  get remainingEggs(): number {
    let sum = 0;
    for (let i = this.index; i < this.orders.length; i++) sum += this.orders[i]!.eggCount;
    return sum;
  }

  get isEmpty(): boolean {
    return this.index >= this.orders.length;
  }

  /** 맨 앞 손님을 처리(서빙/실패)하고 다음으로 진행 */
  advance(): void {
    if (this.index < this.orders.length) this.index++;
  }
}
