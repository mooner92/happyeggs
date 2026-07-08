// JSON 스테이지 스키마 (GDD §10) — 스테이지를 데이터로 정의. 순수 타입 + 검증.
import type { HeatSourceId } from '../data/balance';

export interface StageDef {
  readonly id: string;
  readonly background: string;
  readonly heatSource: HeatSourceId;
  readonly customers: number;
  /** 손님별 주문 계란 수 범위 [최소, 최대] — orderMax ≤ panCapacity 보장 */
  readonly orderRange: readonly [number, number];
  /** 팬 동시 계란 수 (GDD §10 [DECISION-07]) */
  readonly panCapacity: number;
  /** 계란 재고 = 주문 총합 + 여유분 (GDD §6.5) — def에 직접 명시 */
  readonly eggStock: number;
  /** 등장 가능한 적 id 목록 (data/enemies의 부분집합) */
  readonly enemyPool: readonly string[];
  readonly eventBudget: number;
  /** 평균 점수 기준 별 1~3 임계 (오름차순) */
  readonly starThresholds: readonly [number, number, number];
  /** 주방에 배치된 아이템 (GDD §9) — id는 data/items의 키, pos는 ITEM_POS 키 (M4) */
  readonly items?: readonly { readonly id: string; readonly pos: string }[];
}

/** 스테이지 정의 검증 — 문제가 있으면 사유 문자열, 정상이면 null */
export function validateStage(def: StageDef): string | null {
  if (!def.id) return 'id 없음';
  if (def.customers <= 0) return 'customers는 1 이상';
  const [omin, omax] = def.orderRange;
  if (omin <= 0 || omax < omin) return 'orderRange 범위 오류';
  if (def.panCapacity <= 0) return 'panCapacity는 1 이상';
  if (omax > def.panCapacity) return 'orderMax가 panCapacity 초과';
  if (def.eggStock < def.customers * omin) return 'eggStock이 최소 주문 총합 미만';
  const [s1, s2, s3] = def.starThresholds;
  if (!(s1 < s2 && s2 < s3)) return 'starThresholds는 오름차순';
  return null;
}
