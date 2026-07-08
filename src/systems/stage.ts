// 스테이지 세션 (GDD §5·§6.5·§7) — 손님 큐·재고·서빙 점수·진행 상태를 묶는 순수 모델.
// 씬은 이 모델을 구동만 하고, 클리어/실패 판정과 재고·큐 진행은 전부 여기서 결정한다.
import { CustomerQueue, type Order } from './orders';
import { Inventory, isDeadlocked } from './inventory';
import { stageAverage } from './scoring';
import type { StageDef } from './stageDef';

export type StageStatus = 'PLAYING' | 'CLEARED' | 'FAILED';
export type FailReason = 'deadlock' | 'smoke' | 'sneeze' | null;

export class StageSession {
  private readonly queue: CustomerQueue;
  private readonly inventory: Inventory;
  private readonly served: number[] = [];
  private forcedFail: FailReason = null;
  private failedCustomers = 0;
  /** 스테이지 정의 (fromDef로 생성 시) — 열원·적 풀·이벤트 예산·별점 임계 */
  readonly def: StageDef | null;

  constructor(orders: readonly Order[], visibleCount: number, eggStock: number, def: StageDef | null = null) {
    this.queue = new CustomerQueue(orders, visibleCount);
    this.inventory = new Inventory(eggStock);
    this.def = def;
  }

  /** JSON 스테이지 정의로 생성 — 주문은 시드로 결정론 생성 (GDD §10) */
  static fromDef(
    def: StageDef,
    visibleCount: number,
    randomInt: (min: number, max: number) => number,
  ): StageSession {
    const [omin, omax] = def.orderRange;
    const orders: Order[] = Array.from({ length: def.customers }, () => ({
      eggCount: randomInt(omin, omax),
    }));
    return new StageSession(orders, visibleCount, def.eggStock, def);
  }

  /** 하드코딩 스테이지 팩토리 — 주문 랜덤 생성은 시드 주입(결정론) */
  static hardcoded(
    customers: number,
    orderMin: number,
    orderMax: number,
    spareEggs: number,
    visibleCount: number,
    randomInt: (min: number, max: number) => number,
  ): StageSession {
    const orders: Order[] = Array.from({ length: customers }, () => ({
      eggCount: randomInt(orderMin, orderMax),
    }));
    const totalEggs = orders.reduce((s, o) => s + o.eggCount, 0);
    return new StageSession(orders, visibleCount, totalEggs + spareEggs);
  }

  get currentOrder(): Order | null {
    return this.queue.front;
  }

  get visibleOrders(): readonly Order[] {
    return this.queue.visible;
  }

  get customersLeft(): number {
    return this.queue.remaining;
  }

  get remainingStock(): number {
    return this.inventory.remainingStock;
  }

  get servedScores(): readonly number[] {
    return this.served;
  }

  get averageScore(): number {
    return stageAverage(this.served);
  }

  get failedCount(): number {
    return this.failedCustomers;
  }

  /** 재고 부족(진행 불가) — 남은 재고 < 남은 주문 총량 (GDD §6.5) */
  get isDeadlocked(): boolean {
    return isDeadlocked(this.inventory.remainingStock, this.queue.remainingEggs);
  }

  get status(): StageStatus {
    if (this.forcedFail !== null) return 'FAILED';
    if (this.queue.isEmpty) return 'CLEARED';
    if (this.isDeadlocked) return 'FAILED';
    return 'PLAYING';
  }

  get failReason(): FailReason {
    if (this.forcedFail !== null) return this.forcedFail;
    if (this.status === 'FAILED') return 'deadlock';
    return null;
  }

  /** 계란 1개 소모(깨기/로스트/도난) — 재고 있으면 true */
  consumeEgg(n = 1): boolean {
    return this.inventory.consume(n) === n;
  }

  /** 맨 앞 손님 서빙 — 서빙된 계란 점수 기록 후 다음 손님으로 (GDD §6.4) */
  serveCurrent(scores: readonly number[]): void {
    for (const s of scores) this.served.push(s);
    this.queue.advance();
  }

  /** 맨 앞 손님 주문 실패(까만 뒷면 등) — 자기 주문 수만큼 재고 도난 후 진행 (GDD §6.3) */
  failCurrent(): void {
    const order = this.queue.front;
    if (order) this.inventory.consume(order.eggCount);
    this.failedCustomers++;
    this.queue.advance();
  }

  /** 즉사 실패 강제 (스모크→스프링클러 등, GDD §5) */
  forceFail(reason: Exclude<FailReason, null>): void {
    if (this.forcedFail === null) this.forcedFail = reason;
  }
}
