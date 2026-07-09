// 진행도 저장 (GDD §3 — localStorage 래퍼, schema version 필드). 순수 로직 + 주입식 저장소.
// localStorage 접근은 얇은 어댑터(KVStorage)로 분리해 테스트 가능하게 한다.
// v2 (ADR-0011): coins 지갑 추가 — v1 저장은 마이그레이션(스테이지 기록 보존, coins=0).
import type { Stars } from './stars';

/** key-value 저장소 어댑터 (localStorage 호환) */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StageRecord {
  readonly bestAverage: number;
  readonly bestStars: Stars;
  readonly cleared: boolean;
}

export interface SaveData {
  readonly schemaVersion: number;
  readonly stages: Record<string, StageRecord>;
  /** 코인 지갑 (GDD §12 — M5 스킨 상점 재화) */
  readonly coins: number;
}

export const SAVE_KEY = 'eggflip.save';
export const SAVE_SCHEMA_VERSION = 2;

function emptySave(): SaveData {
  return { schemaVersion: SAVE_SCHEMA_VERSION, stages: {}, coins: 0 };
}

/** 구버전 → 현재 스키마 마이그레이션. 알 수 없는 버전만 리셋 */
function migrate(parsed: { schemaVersion?: number; stages?: unknown; coins?: unknown }): SaveData {
  if (typeof parsed?.stages !== 'object' || parsed.stages === null) return emptySave();
  const stages = parsed.stages as Record<string, StageRecord>;
  if (parsed.schemaVersion === 1) {
    return { schemaVersion: SAVE_SCHEMA_VERSION, stages, coins: 0 };
  }
  if (parsed.schemaVersion === SAVE_SCHEMA_VERSION) {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      stages,
      coins: typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? parsed.coins : 0,
    };
  }
  return emptySave();
}

/** 저장 로드 — 없거나 파싱 실패면 빈 저장, v1은 마이그레이션 */
export function loadSave(storage: KVStorage): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return emptySave();
  try {
    return migrate(JSON.parse(raw) as SaveData);
  } catch {
    return emptySave();
  }
}

function persist(storage: KVStorage, save: SaveData): SaveData {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
  return save;
}

/**
 * 결과 기록 — 스테이지별 최고 평균/별점만 갱신(하락은 무시), cleared는 OR. 갱신된 SaveData 반환.
 */
export function recordResult(
  storage: KVStorage,
  stageId: string,
  average: number,
  stars: Stars,
  cleared: boolean,
): SaveData {
  const save = loadSave(storage);
  const prev = save.stages[stageId];
  const merged: StageRecord = {
    bestAverage: Math.max(prev?.bestAverage ?? 0, average),
    bestStars: Math.max(prev?.bestStars ?? 0, stars) as Stars,
    cleared: (prev?.cleared ?? false) || cleared,
  };
  return persist(storage, {
    ...save,
    schemaVersion: SAVE_SCHEMA_VERSION,
    stages: { ...save.stages, [stageId]: merged },
  });
}

/** 코인 적립(음수 = 지출) — 0 미만으로 내려가지 않는다. 갱신된 SaveData 반환 */
export function addCoins(storage: KVStorage, delta: number): SaveData {
  const save = loadSave(storage);
  const coins = Math.max(0, save.coins + Math.trunc(delta));
  return persist(storage, { ...save, coins });
}
