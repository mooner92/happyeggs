// placeholder programmer art 팔레트 (GDD §14 — 도형 + 제한 팔레트).
// 표현 값이므로 balance.ts와 분리한다 (ADR-0008). M5 열화상/스킨은 이 파일 교체로 대응.

/**
 * 익힘 상태 키 — systems/CookingModel의 CookState와 동일 리터럴.
 * data/는 systems/를 import하지 않는다(의존 방향 규칙). 뷰가 CookState로
 * COOK_STATE_STYLE을 인덱싱하는 순간 두 유니온의 불일치는 컴파일 에러로 잡힌다.
 */
export type CookStateKey = 'RAW' | 'SET' | 'PERFECT_WINDOW' | 'OVERDONE' | 'BURNT' | 'SMOKE';

/** 기본 팔레트 — 따뜻한 주방 톤 (Bacon 레퍼런스) */
export const PALETTE = {
  bg: 0x24201d,
  pan: 0x40403f,
  panSheen: 0x5a5a58,
  panRim: 0x121110,
  white: 0xf6efe2,
  yolk: 0xf5b63f,
} as const;

/** 배경 벽 그라데이션(위→아래) */
export const WALL_GRADIENT = { top: 0x2c2622, bottom: 0x1c1815 } as const;

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

export const YOLK_STYLE = { fill: 0xf5b63f, edge: 0xd9902a, highlight: 0xfff0c2 } as const;
/** 흰자 광택(글로시 하이라이트) 색 */
export const EGG_GLOSS = 0xfffdf6;

/** 손 placeholder 색 */
export const HAND_STYLE = { fill: 0xf5b63f, line: 0xd9902a } as const;

/** 뒤집개(스패출러) — 팬/배경보다 밝은 금속색으로 손에 든 도구임을 읽히게 (GDD §4 1인칭 양손) */
export const SPATULA_STYLE = { blade: 0xb9bcc2, bladeEdge: 0x6b6e74, handle: 0x9a7b4a } as const;

/** 주방 카운터 — 따뜻한 나무 톤 (GDD §4 [주방 카운터]) */
export const COUNTER_STYLE = { front: 0x3b322a, top: 0x574636, lip: 0x6b573f } as const;

/** 주방 무대 (구체화 패스) — 타일 벽·서빙 바·아이템 거치판 */
export const KITCHEN_STYLE = {
  tileLine: 0x14100c, // 벽 타일 줄눈 (알파로 은은하게)
  ceilingShade: 0x000000,
  serveBarTop: 0x6b573f,
  serveBarFront: 0x453626,
  serveBarLip: 0x86704f,
  plaque: 0x4a3a28, // 아이템 거치판(나무)
  plaqueEdge: 0x2b2117,
  hook: 0x9a9da3, // 금속 걸이
} as const;

/** 스토브 (열원 시각화, GDD §6.2) — 열계수를 눈에 보이게 */
export const STOVE_STYLE = {
  base: 0x17140f,
  baseEdge: 0x000000,
  gasFlame: 0x4aa8ff, // 가스 파란 불꽃
  gasFlameCore: 0xbfe0ff,
  coal: 0xff7a2a, // 화롯불 숯
  coalDark: 0x7a3512,
  emberGlow: 0xff9a4a,
} as const;

/** 무자막 조작 힌트 픽토그램 */
export const HINT_STYLE = { icon: 0xf2e9dc, accent: 0x9be564 } as const;

/** 손님 리액션 이모트 (ADR-0011, GPGP식 표정 피드백 — 무자막) */
export const EMOTE_STYLE = {
  love: 0xff6b81, // 하트
  ok: 0xf5c542, // 별
  angry: 0xff5544, // 분노 마크
} as const;

/** 코인 (GDD §12 재화) */
export const COIN_STYLE = { fill: 0xf5c542, edge: 0xb8862a, shine: 0xfff0c2 } as const;

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

/** 결과 화면 — 접시·별 */
export const RESULT_STYLE = {
  plate: 0xf2ede3,
  plateEdge: 0xcdc4b4,
  plateShade: 0xe2dacb,
  starOn: 0xf5c542,
  starOff: 0x4a453d,
  starEdge: 0x8a6a1f,
} as const;

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

/** 방해꾼 — 닌자 거미 */
export const SPIDER_STYLE = {
  body: 0x2b2b33,
  bodyEdge: 0x14141a,
  leg: 0x1a1a1f,
  thread: 0xd8d8e0,
  knife: 0xb9bcc2,
  eye: 0xff5544,
} as const;

/** 방해꾼 — 뒷문 강도 + 고양이 */
export const ROBBER_STYLE = {
  body: 0x3a3550,
  hood: 0x272340,
  eye: 0xf2e9dc,
  bag: 0x6b5a3a,
} as const;
export const CAT_STYLE = { body: 0x4a4a52, ear: 0x2f2f37, eye: 0x9be564 } as const;

/** 전조(위험) 표시 색 */
export const TELEGRAPH_STYLE = { warn: 0xff5544, web: 0xc9c9d4 } as const;

/** 주방 아이템 (GDD §9) — 절차적 도형. 뚜껑·토치·펜싱칼·방패(decoy) */
export const ITEM_STYLE = {
  plate: 0x2b2117, // 벽걸이 판 배경
  lid: 0xb9bcc2,
  lidEdge: 0x6b6e74,
  lidKnob: 0x8f6a3a,
  torchStick: 0x9a7b4a,
  torchFlame: 0xf5902a,
  torchFlameCore: 0xffd66b,
  sword: 0xd4d7dd,
  swordEdge: 0x6b6e74,
  swordGuard: 0xc99a3a,
  shield: 0xc0562f,
  shieldEdge: 0x7a2f1a,
  shieldBoss: 0xe8c66b,
} as const;

/** 재채기 손님 — 침 구름 */
export const SNEEZE_STYLE = {
  body: 0xc98a9b,
  face: 0x2b2117,
  spray: 0xbfe0ff,
  nose: 0xe86a55,
} as const;

/** 머리카락 손님 — 낙하하는 머리카락 */
export const HAIR_STYLE = { strand: 0x2b2117, burn: 0xf5902a } as const;

/** 파리 — 몸통·날개·똥 */
export const FLY_STYLE = {
  body: 0x1c1c22,
  wing: 0xcfd6df,
  eye: 0xff5544,
  poop: 0x6b4a2b,
  star: 0xf5c542,
} as const;

/** 저격수 (GDD §8.1 ⑤) — 조준 레이저·락온·총알 구멍 */
export const SNIPER_STYLE = {
  body: 0x353b33,
  bodyEdge: 0x14170f,
  aim: 0xff5544, // 조준 스윕(점선)
  lock: 0xff2a2a, // 락온 빔
  reflect: 0x9be564, // 패링 반사
  hole: 0x1a120a, // 총알 구멍
  scope: 0x9be564,
} as const;

/** 숫자 색 → CSS 문자열 (Phaser Text 스타일용) */
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
