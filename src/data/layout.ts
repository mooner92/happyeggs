// 해상도·좌표의 단일 출처 — 중앙 액션 칼럼 기준 비율 앵커 (DECISION-05 가로 확장 대비).
// 논리 해상도 720×1280은 ADR-0004. 표현 값이므로 balance.ts와 분리 (ADR-0008).

export const DESIGN = { width: 720, height: 1280 } as const;

export interface Anchor {
  readonly x: number;
  readonly y: number;
}

/** DESIGN 대비 0~1 비율 앵커 */
export const ANCHORS = {
  pan: { x: 0.5, y: 0.58 } as Anchor,
  handLeft: { x: 0.16, y: 0.9 } as Anchor,
  handRight: { x: 0.84, y: 0.9 } as Anchor,
  hudOrigin: { x: 0.03, y: 0.015 } as Anchor,
  resultButton: { x: 0.97, y: 0.015 } as Anchor,
} as const;

/** 팬 반경 = DESIGN.width × 이 비율 */
export const PAN_RADIUS_RATIO = 0.3;
/** 팬 손잡이 길이 = 팬 반경 × 이 비율 */
export const PAN_HANDLE_RATIO = 0.85;

/** 비율 앵커 → 픽셀 좌표 */
export function toPx(a: Anchor): { x: number; y: number } {
  return { x: a.x * DESIGN.width, y: a.y * DESIGN.height };
}
