// 진행도 저장 (GDD §3 — localStorage 래퍼, schema version 필드). 순수 로직 + 주입식 저장소.
// localStorage 접근은 얇은 어댑터(KVStorage)로 분리해 테스트 가능하게 한다.
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
}

export const SAVE_KEY = 'eggflip.save';
export const SAVE_SCHEMA_VERSION = 1;

function emptySave(): SaveData {
  return { schemaVersion: SAVE_SCHEMA_VERSION, stages: {} };
}

/** 저장 로드 — 없거나 스키마 불일치/파싱 실패면 빈 저장으로 리셋 */
export function loadSave(storage: KVStorage): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return emptySave();
  try {
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed?.schemaVersion !== SAVE_SCHEMA_VERSION || typeof parsed.stages !== 'object') {
      return emptySave();
    }
    return parsed;
  } catch {
    return emptySave();
  }
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
  const next: SaveData = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    stages: { ...save.stages, [stageId]: merged },
  };
  storage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}
