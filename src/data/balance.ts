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

/** 흰자 흐름(드리프트) + 뒤집개로 모으기 (GDD §6.1 확장 — DECISION-10/ADR-0012).
 *  흰자가 한쪽으로 흘러 불룩해지고, 그 가장자리를 탭하면 중심으로 밀려 들어온다. */
export const FLOW = {
  /** 드리프트 성장 px/초 (섹터 중심, cos 폴오프) */
  driftPxPerSec: 18,
  /** 드리프트 섹터 반각(rad) */
  driftHalfWidthRad: 0.8,
  /** 드리프트 방향 1회전 주기(초) — 시드별 위상 오프셋 */
  driftRotatePeriodSec: 16,
  /** 정점별 바깥 누적 상한(px) — 방치 시 최대 불룩 */
  maxOutPx: 44,
  /** 정점별 안쪽 상한(px) — 과한 밀기 움푹 한계 */
  maxInPx: 24,
  /** 뒤집개 밀기 반경(px) */
  pushRadiusPx: 130,
  /** 1탭당 불룩(+flow)이 깎이는 비율(0~1, 거리 폴오프 곱) — 비례 감쇠라 크레이터가 안 생긴다 */
  pushFactor: 0.6,
  /** 1탭당 0 아래로 패일 수 있는 깊이(px) — 불룩 제거는 빠르게, 움푹은 천천히 */
  dentPerTapPx: 3,
  /** flow 이웃 스무딩 계수(스텝당) — 눌린 자국이 자연스럽게 퍼짐 */
  smooth: 0.12,
  /** 밀기 힌트 노출 불룩 임계(px) */
  hintBulgePx: 22,
} as const;

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
    /** 저격수 총알 구멍 1개당 (GDD §8.1 ⑤ "채점 반영" — 정확 수치 미명시, [DECISION-08]) */
    bulletHole: -12.0,
  },
} as const;

/** 손님/주문 (GDD §7) */
export const ORDER = {
  /** 대기열에 보이는 최대 손님 수 (3~4) */
  visibleCount: 4,
} as const;

/** 코인 보상 (GDD §12 BM 스캐폴드 — ADR-0011 손님 중심 루프 + 경제) — 계란 1개 서빙당 */
export const COIN = {
  /** 기본 지불 */
  basePay: 2,
  /** 팁 구간 — 점수 이상이면 코인 추가 (내림차순 첫 매칭) */
  tips: [
    { min: 95, coins: 4 },
    { min: 85, coins: 2 },
    { min: 70, coins: 1 },
  ],
} as const;

/** 손님 리액션 임계 — 서빙 평균 점수 기준 (ADR-0011) */
export const REACTION = {
  love: 90, // 이상 → 하트
  ok: 70, // 이상 → 별 / 미만 → 분노
} as const;

/** M1 하드코딩 스테이지 1 (M3에서 JSON 스테이지 데이터로 이전) */
export const STAGE1 = {
  customers: 5,
  orderMin: 1,
  orderMax: 2,
  /** 여유분 — eggStock = 주문 총합 + spareEggs (GDD §6.5) */
  spareEggs: 3,
  /** 스테이지 번호 — 적 stageUnlock 필터용 */
  stageNumber: 1,
  /** M2 방해꾼 이벤트 (GDD §8) */
  eventBudget: 3,
  eventSpawnGapMs: [2500, 5000] as [number, number],
  eventMaxConcurrent: 1,
} as const;

/** 감점: 노른자 파손 등은 SCORE.deduction (위) 참조 */

/** M0 디버그·방어 상수 */
export const DEBUG = {
  /** M0 팬 동시 계란 상한(퍼짐 다중 확인용). 정식 panCapacity는 M3 스테이지 데이터 [DECISION-07] */
  MAX_EGGS: 3,
  /** dt 클램프(초) — 탭 복귀 거대 dt 방어 (ADR-0006) */
  MAX_DT_SEC: 0.1,
  /** 디버그 HUD 텍스트 갱신 주기(ms) */
  HUD_INTERVAL_MS: 250,
} as const;
