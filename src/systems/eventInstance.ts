// 이벤트 인스턴스 — 한 방해꾼의 telegraph→window→resolve 상태기계 (GDD §8). 순수.
import type { EnemyDef, InputKey } from './enemyDef';

export type EventPhase = 'TELEGRAPH' | 'WINDOW' | 'RESOLVED';
export type EventResult = 'pending' | 'success' | 'fail';

export class EventInstance {
  private elapsed = 0;
  private _result: EventResult = 'pending';

  constructor(readonly def: EnemyDef) {}

  get phase(): EventPhase {
    if (this._result !== 'pending') return 'RESOLVED';
    if (this.elapsed < this.def.telegraphMs) return 'TELEGRAPH';
    return 'WINDOW';
  }

  get result(): EventResult {
    return this._result;
  }

  get isResolved(): boolean {
    return this._result !== 'pending';
  }

  /** 현재 phase 내 진행도 0~1 (전조/윈도우 바 표시용) */
  get phaseProgress01(): number {
    const t = this.def.telegraphMs;
    const w = this.def.responseWindowMs;
    if (this.phase === 'TELEGRAPH') return t > 0 ? this.elapsed / t : 1;
    if (this.phase === 'WINDOW') return w > 0 ? (this.elapsed - t) / w : 1;
    return 1;
  }

  /** 시간 진행 — window 만료 시 자동 실패 */
  update(dtMs: number): void {
    if (this._result !== 'pending' || dtMs <= 0) return;
    this.elapsed += dtMs;
    if (this.elapsed >= this.def.telegraphMs + this.def.responseWindowMs) {
      this._result = 'fail';
    }
  }

  /** 대응 입력 — window 중 일치하면 성공. telegraph/resolve 중이거나 불일치면 무시 */
  tryInput(key: InputKey): boolean {
    if (this.phase !== 'WINDOW') return false;
    if (key !== this.def.input) return false;
    this._result = 'success';
    return true;
  }
}
