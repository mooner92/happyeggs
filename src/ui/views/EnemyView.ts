import type { EventInstance } from '../../systems/eventInstance';

/** 방해꾼 뷰 공통 인터페이스 — 씬은 스폰 시 생성, 매 프레임 update, 해소 시 playResolve 후 destroy */
export interface EnemyView {
  /** phase/진행도에 맞춰 위치·연출 갱신 */
  update(inst: EventInstance): void;
  /** 성공/실패 결말 연출 (거미 낙하·강도 도주 등). 애니 완료 콜백 */
  playResolve(result: 'success' | 'fail', onDone: () => void): void;
  destroy(): void;
}
