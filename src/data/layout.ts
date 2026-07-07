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

/** 텍스트 크기 (표현 값) */
export const TEXT = {
  resultSize: '36px',
  hudSize: '22px',
  buttonSize: '28px',
} as const;

/** 팬 도형 표현 비율 (팬 반경 대비) */
export const PAN_SHAPE = {
  rim: 1.06,
  handleWidth: 0.16,
  /** 손잡이 시작점 — 팬 중심 기준 (반경 대비 비율) */
  handleFrom: { x: -0.6, y: 0.6 },
} as const;

/** 손·뒤집개 도형 크기 (px, 표현 값) */
export const HAND_SHAPE = {
  w: 120,
  h: 96,
  outline: 5,
  spatulaW: 18,
  bladeW: 92,
  bladeH: 66,
  /** 뒤집개 날 위치 — 오른손에서 팬 방향으로 뻗는 비율 */
  spatulaReach: 0.45,
} as const;
