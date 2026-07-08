// placeholder programmer art 팔레트 (GDD §14 — 도형 + 제한 팔레트).
// 표현 값이므로 balance.ts와 분리한다 (ADR-0008). M5 열화상/스킨은 이 파일 교체로 대응.

/**
 * 익힘 상태 키 — systems/CookingModel의 CookState와 동일 리터럴.
 * data/는 systems/를 import하지 않는다(의존 방향 규칙). 뷰가 CookState로
 * COOK_STATE_STYLE을 인덱싱하는 순간 두 유니온의 불일치는 컴파일 에러로 잡힌다.
 */
export type CookStateKey = 'RAW' | 'SET' | 'PERFECT_WINDOW' | 'OVERDONE' | 'BURNT' | 'SMOKE';

/** 기본 5색 팔레트 */
export const PALETTE = {
  bg: 0x2b2b2b,
  pan: 0x3a3a3a,
  panRim: 0x141414,
  white: 0xf2e9dc,
  yolk: 0xf5b63f,
} as const;

export interface EggStyle {
  readonly fill: number;
  readonly alpha: number;
  readonly edge: number;
  readonly edgeAlpha: number;
}

/** 익힘 상태별 흰자 표현 — RAW(반투명) → 익을수록 불투명·갈변 → BURNT/SMOKE(검게) (GDD §6.1) */
export const COOK_STATE_STYLE: Readonly<Record<CookStateKey, EggStyle>> = {
  RAW: { fill: 0xf2e9dc, alpha: 0.5, edge: 0xf2e9dc, edgeAlpha: 0.35 },
  SET: { fill: 0xf7f1e5, alpha: 0.9, edge: 0xe8d9b8, edgeAlpha: 0.9 },
  PERFECT_WINDOW: { fill: 0xfffaf0, alpha: 1.0, edge: 0xd9a441, edgeAlpha: 1.0 },
  OVERDONE: { fill: 0xe8d3ae, alpha: 1.0, edge: 0x8a5a2b, edgeAlpha: 1.0 },
  BURNT: { fill: 0x6d4a26, alpha: 1.0, edge: 0x2b2117, edgeAlpha: 1.0 },
  SMOKE: { fill: 0x3a2e20, alpha: 1.0, edge: 0x14100a, edgeAlpha: 1.0 },
};

export const YOLK_STYLE = { fill: 0xf5b63f, edge: 0xd9902a } as const;

/** 손 placeholder 색 */
export const HAND_STYLE = { fill: 0xf5b63f, line: 0xd9902a } as const;

/** 뒤집개(스패출러) — 팬/배경보다 밝은 금속색으로 손에 든 도구임을 읽히게 (GDD §4 1인칭 양손) */
export const SPATULA_STYLE = { blade: 0xb9bcc2, bladeEdge: 0x6b6e74, handle: 0x9a7b4a } as const;

/** 주방 카운터 placeholder — 팬이 허공에 뜨지 않도록 바닥을 준다 (GDD §4 [주방 카운터]) */
export const COUNTER_STYLE = { front: 0x332f2a, lip: 0x45403a } as const;

/** 디버그 HUD 텍스트 색 (CSS 색 문자열 — Phaser Text 스타일용) */
export const HUD_TEXT = { normal: '#9be564', warning: '#ff5544' } as const;

/** 파워 게이지 — 트랙/채움/스윗스팟/마커 */
export const GAUGE_STYLE = {
  track: 0x211d18,
  trackEdge: 0x000000,
  fill: 0xf5b63f,
  sweetspot: 0x9be564,
  marker: 0xfffaf0,
} as const;

/** 점수 팝업 텍스트 색 */
export const SCORE_TEXT = { good: '#9be564', normal: '#f2e9dc', bad: '#ff8c55' } as const;

/** 손님(Bacon 톤 캐릭터) — 몸통 색은 인덱스별로 순환, 얼굴/윤곽 공통 */
export const CUSTOMER_STYLE = {
  bodies: [0xe8a15c, 0x7bb5a3, 0xc98a9b, 0x8f9bd1, 0xd4b483] as const,
  outline: 0x2b2117,
  face: 0x2b2117,
  cheek: 0xffffff,
} as const;

/** 말풍선 */
export const BUBBLE_STYLE = { fill: 0xf7f1e5, edge: 0x2b2117 } as const;

/** 스테이지 HUD 텍스트 색 */
export const STAGE_HUD_TEXT = { normal: '#f2e9dc', low: '#ff8c55' } as const;

/** 숫자 색 → CSS 문자열 (Phaser Text 스타일용) */
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
