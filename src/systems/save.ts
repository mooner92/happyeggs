// 진행도 저장 (GDD §3 — localStorage 래퍼, schema version 필드). 순수 로직 + 주입식 저장소.
// localStorage 접근은 얇은 어댑터(KVStorage)로 분리해 테스트 가능하게 한다.
// v2 (ADR-0011): coins 지갑 추가 — v1 저장은 마이그레이션(스테이지 기록 보존, coins=0).
// v3 (GDD §12 M5): 스킨 보유/장착 추가 — v1·v2 저장은 기록·코인 보존 마이그레이션.
import { DEFAULT_SKIN_ID } from '../data/skins';
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
  /** 보유 스킨 id 목록 (GDD §12 — 기본 스킨은 항상 포함) */
  readonly ownedSkins: readonly string[];
  /** 장착 중인 스킨 id */
  readonly equippedSkin: string;
}

export const SAVE_KEY = 'eggflip.save';
export const SAVE_SCHEMA_VERSION = 3;

function emptySave(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    stages: {},
    coins: 0,
    ownedSkins: [DEFAULT_SKIN_ID],
    equippedSkin: DEFAULT_SKIN_ID,
  };
}

/** 구버전 → 현재 스키마 마이그레이션. 알 수 없는 버전만 리셋 */
function migrate(parsed: {
  schemaVersion?: number;
  stages?: unknown;
  coins?: unknown;
  ownedSkins?: unknown;
  equippedSkin?: unknown;
}): SaveData {
  if (typeof parsed?.stages !== 'object' || parsed.stages === null) return emptySave();
  const stages = parsed.stages as Record<string, StageRecord>;
  // v1: coins 없음 → 0, 스킨 기본값
  if (parsed.schemaVersion === 1) {
    return { ...emptySave(), stages };
  }
  const coins =
    typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? parsed.coins : 0;
  // v2: 스킨 없음 → 기본값 (기록·코인 보존)
  if (parsed.schemaVersion === 2) {
    return { ...emptySave(), stages, coins };
  }
  if (parsed.schemaVersion === SAVE_SCHEMA_VERSION) {
    // 필드 검증 + 불변식 강제 (기록·코인은 보존):
    // ① ownedSkins에는 기본 스킨이 항상 포함 ② equippedSkin은 보유 스킨만 (아니면 기본 폴백)
    const rawList =
      Array.isArray(parsed.ownedSkins) && parsed.ownedSkins.every((s) => typeof s === 'string')
        ? (parsed.ownedSkins as readonly string[])
        : [DEFAULT_SKIN_ID];
    const ownedSkins = rawList.includes(DEFAULT_SKIN_ID)
      ? rawList
      : [DEFAULT_SKIN_ID, ...rawList];
    const equippedSkin =
      typeof parsed.equippedSkin === 'string' && ownedSkins.includes(parsed.equippedSkin)
        ? parsed.equippedSkin
        : DEFAULT_SKIN_ID;
    return { schemaVersion: SAVE_SCHEMA_VERSION, stages, coins, ownedSkins, equippedSkin };
  }
  return emptySave();
}

/** 저장 로드 — 없거나 파싱 실패면 빈 저장, v1·v2는 마이그레이션 */
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

/** 스킨 보유 추가 — 이미 보유 중이면 무변경(idempotent). 갱신된 SaveData 반환 */
export function unlockSkin(storage: KVStorage, id: string): SaveData {
  const save = loadSave(storage);
  if (save.ownedSkins.includes(id)) return persist(storage, save);
  return persist(storage, { ...save, ownedSkins: [...save.ownedSkins, id] });
}

/** 스킨 장착 — 보유 중일 때만 변경, 미보유면 무변경 저장 반환 */
export function equipSkin(storage: KVStorage, id: string): SaveData {
  const save = loadSave(storage);
  if (!save.ownedSkins.includes(id)) return persist(storage, save);
  return persist(storage, { ...save, equippedSkin: id });
}
