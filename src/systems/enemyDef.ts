// 방해꾼 이벤트 공통 스키마 (GDD §8) — 새 적 = 이 데이터 1항목 + 입력 핸들러 1개. 순수 타입.

/** 대응 입력 키 (GDD §4 입력 사전) */
export type InputKey = 'drag_cut' | 'double_tap' | 'tap' | 'swipe' | 'hold_release' | 'parry';

export interface EnemyDef {
  readonly id: string;
  /** 이 스테이지 번호 이상부터 등장 */
  readonly stageUnlock: number;
  /** 전조 연출 시간(ms) — 입력 불가 */
  readonly telegraphMs: number;
  /** 대응 입력 허용 시간(ms) */
  readonly responseWindowMs: number;
  /** 대응 입력 핸들러 키 */
  readonly input: InputKey;
  /** 재등장 쿨다운 범위 [최소, 최대] ms */
  readonly cooldownMs: readonly [number, number];
  /** 이 적의 동시 등장 상한 */
  readonly maxConcurrent: number;
  /** 성공 시 실행할 이펙트 키 목록 */
  readonly onSuccess: readonly string[];
  /** 실패 시 실행할 이펙트 키 목록 */
  readonly onFail: readonly string[];
}
