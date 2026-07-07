// 자체 경량 typed pub/sub (GDD §3, ADR-0002). 외부 상태관리 라이브러리 금지.

export type Unsubscribe = () => void;

/**
 * - emit 중에 on/off가 일어나도 안전하도록 스냅샷을 순회한다.
 * - 씬이 등록한 리스너는 씬 shutdown에서 반드시 해제한다 (docs/02-architecture.md §4).
 */
export class EventBus<E extends object> {
  private listeners = new Map<keyof E, Set<(payload: never) => void>>();

  on<K extends keyof E>(event: K, fn: (payload: E[K]) => void): Unsubscribe {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as (payload: never) => void);
    return () => this.off(event, fn);
  }

  off<K extends keyof E>(event: K, fn: (payload: E[K]) => void): void {
    this.listeners.get(event)?.delete(fn as (payload: never) => void);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      (fn as (payload: E[K]) => void)(payload);
    }
  }

  /** 등록된 리스너 전부 해제 — 씬 재시작 시 유령 리스너 방지용 백스톱 */
  clear(): void {
    this.listeners.clear();
  }
}
