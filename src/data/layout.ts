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

/** 3/4 원근 — 팬·계란을 세로로 눌러 살짝 누운(비스듬히 본) 느낌을 준다 (Bacon 톤). */
export const PERSPECTIVE = {
  /** 세로 압축 비율(1=정원, 작을수록 눕는다) */
  squashY: 0.66,
  /** 팬 옆벽(깊이) 두께 px — 하단 어두운 립으로 표현 */
  panWallPx: 20,
} as const;

/** 팬 도형 표현 비율 (팬 반경 대비) */
export const PAN_SHAPE = {
  rim: 1.06,
  handleWidth: 0.16,
  /** 손잡이 시작점 — 팬 중심 기준 (반경 대비 비율, y는 원근 압축 전 기준) */
  handleFrom: { x: -0.58, y: 0.5 },
} as const;

/** 손·뒤집개 도형 크기 (px, 표현 값) */
export const HAND_SHAPE = {
  w: 120,
  h: 96,
  outline: 5,
  spatulaW: 22,
  bladeW: 108,
  bladeH: 74,
  bladeEdge: 4,
  /** 뒤집개 날 위치 — 오른손에서 팬 방향으로 뻗는 비율(팬 위로 걸치게 크게) */
  spatulaReach: 0.62,
} as const;

/** 주방 카운터 밴드 — 팬 아래를 받치는 바닥 (표현 값) */
export const COUNTER_BAND = {
  topRatio: 0.66, // 화면 높이 대비 카운터 윗면 위치
  lipPx: 12, // 윗면 하이라이트 두께
} as const;

/** 렌더 깊이 — 카운터(뒤) < 팬 < 계란 < 손(앞) < 게이지/HUD */
export const DEPTH = {
  counter: -3,
  pan: -2,
  egg: 0,
  hand: 2,
  queue: 5,
  gauge: 900,
  popup: 950,
  hud: 1000,
} as const;

/** 파워 게이지 바 (세로) — 팬 우측, 값 0(아래)→1(위) */
export const GAUGE_BAR = {
  xRatio: 0.9,
  yTopRatio: 0.3,
  yBottomRatio: 0.6,
  widthPx: 34,
} as const;

/** 뒤집기 애니 (트윈 절차 애니) */
export const FLIP_ANIM = {
  /** 포물선 최고점 높이 px */
  peakPx: 170,
  /** 한 번 뒤집는 시간 ms */
  durationMs: 520,
  /** 반접힘 시 가로 압축 배율 */
  foldScaleX: 0.42,
  /** 착지 스쿼시 배율·시간 */
  squashScaleX: 1.18,
  squashMs: 120,
} as const;

/** 스와이프 서빙 최소 이동 px (위로) */
export const SERVE_SWIPE_PX = 90;
/** 탭(깨기)로 판정하는 최대 홀드 ms — 이보다 길게 누르면 뒤집기 게이지 */
export const TAP_MAX_MS = 180;

/** 손님 대기열 — 상단, 앞에서부터 x비율·스케일 (GDD §7 3~4명 표시) */
export const QUEUE = {
  yRatio: 0.15,
  xRatios: [0.3, 0.5, 0.66, 0.8],
  scales: [1.0, 0.82, 0.72, 0.66],
  bodyW: 128,
  bodyH: 150,
} as const;

/** 말풍선 (맨 앞 손님 주문) */
export const BUBBLE = { w: 130, h: 74, abovePx: 118, eggIconR: 13, eggGapPx: 34 } as const;

/** 스테이지 HUD — 재고(상단 중앙)·서빙 평균 */
export const STAGE_HUD = { yRatio: 0.045, eggIconR: 15, gapPx: 34, xRatio: 0.5 } as const;
