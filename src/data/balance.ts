// ★ 게임플레이 튜닝 수치의 단일 출처 (GDD §0 — 매직넘버 인라인 금지).
// 범위 해석: 튜닝 수치만 이 파일에 둔다 — 색은 palette.ts, 좌표는 layout.ts (ADR-0008).

/** 열원 종류 (GDD §6.2) */
export type HeatSourceId = 'gas' | 'induction' | 'brazier' | 'campfire' | 'lava';

/** 열원 계수 — base에 ±jitter 랜덤 요동(캠프파이어) */
export interface HeatSpec {
  readonly base: number;
  readonly jitter?: number;
}

/** GDD §6.2 스펙 값 전부 선기입. M0 씬은 gas만 사용한다. */
export const HEAT: Readonly<Record<HeatSourceId, HeatSpec>> = {
  gas: { base: 1.0 },
  induction: { base: 0.8 },
  brazier: { base: 1.3 },
  campfire: { base: 1.5, jitter: 0.3 },
  lava: { base: 2.5 },
};

/** 익힘 FSM 임계값 — 단위: 초(유효 조리 시간 = Σ dt × 열원계수) */
export interface CookThresholds {
  readonly SET_AT: number;
  readonly PERFECT_START: number;
  readonly PERFECT_END: number;
  readonly BURNT_AT: number;
  readonly SMOKE_AT: number;
  /** SMOKE 진입 후 경고까지 유예(초) — 실시간 기준, 열원 계수 무관 (ADR-0005) */
  readonly SPRINKLER_DELAY: number;
}

/** 초기 시안 — GDD §5 "스테이지 초반 8~15초/판" 기준 */
export const COOK: CookThresholds = {
  SET_AT: 3.0,
  PERFECT_START: 6.0,
  PERFECT_END: 8.0,
  BURNT_AT: 11.0,
  SMOKE_AT: 13.0,
  SPRINKLER_DELAY: 3.0,
};

/** 계란 블롭 형태 파라미터 (GDD §6.1 — 정점 40~64개 범위 내) */
export interface BlobConfig {
  readonly VERTEX_COUNT: number;
  readonly INITIAL_RADIUS: number;
  readonly MAX_RADIUS: number;
  /** 퍼짐이 최대 반경에 도달하는 시간(초) */
  readonly SPREAD_SECONDS: number;
  /** 정점별 노이즈 진폭(반경 대비 비율) */
  readonly NOISE_AMP: number;
  /** 링 한 바퀴에 들어가는 노이즈 굴곡 수 */
  readonly NOISE_FREQ: number;
  /** 이웃 정점 스무딩 패스 횟수 */
  readonly SMOOTHING_PASSES: number;
  /** 노른자 반경 = INITIAL_RADIUS × 이 비율 */
  readonly YOLK_RADIUS_RATIO: number;
  /** 노른자 중심 오프셋 상한(INITIAL_RADIUS 대비 비율) */
  readonly YOLK_OFFSET_RATIO: number;
}

export const EGG: BlobConfig = {
  VERTEX_COUNT: 48,
  INITIAL_RADIUS: 30,
  MAX_RADIUS: 78,
  SPREAD_SECONDS: 5.0,
  NOISE_AMP: 0.16,
  NOISE_FREQ: 5,
  SMOOTHING_PASSES: 2,
  YOLK_RADIUS_RATIO: 0.42,
  YOLK_OFFSET_RATIO: 0.18,
};

/** 뒤집기 — 왕복 파워 게이지 + 스윗스팟 판정 윈도우 (GDD §6.3, §0 "판정 윈도우는 balance.ts") */
export const FLIP = {
  /** 게이지 왕복 1주기(초) — 홀드 시 0→1→0 */
  periodSec: 1.2,
  /** 클린 착지 스윗스팟 [lo, hi] (게이지 값 0~1) */
  sweetspot: { lo: 0.7, hi: 0.9 },
} as const;

/** 채점 고정 감점 (GDD §6.1·§8.1 — 원형도와 별개, M4 이벤트에서 발생) */
export const SCORE = {
  deduction: {
    yolkBurst: -15.0,
    hair: -10.0,
    flyPoop: -20.0,
  },
} as const;

/** 손님/주문 (GDD §7) */
export const ORDER = {
  /** 대기열에 보이는 최대 손님 수 (3~4) */
  visibleCount: 4,
} as const;

/** M1 하드코딩 스테이지 1 (M3에서 JSON 스테이지 데이터로 이전) */
export const STAGE1 = {
  customers: 5,
  orderMin: 1,
  orderMax: 2,
  /** 여유분 — eggStock = 주문 총합 + spareEggs (GDD §6.5) */
  spareEggs: 3,
} as const;

/** M0 디버그·방어 상수 */
export const DEBUG = {
  /** M0 팬 동시 계란 상한(퍼짐 다중 확인용). 정식 panCapacity는 M3 스테이지 데이터 [DECISION-07] */
  MAX_EGGS: 3,
  /** dt 클램프(초) — 탭 복귀 거대 dt 방어 (ADR-0006) */
  MAX_DT_SEC: 0.1,
  /** 디버그 HUD 텍스트 갱신 주기(ms) */
  HUD_INTERVAL_MS: 250,
} as const;
