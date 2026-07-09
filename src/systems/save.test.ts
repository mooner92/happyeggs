import { describe, expect, it } from 'vitest';
import { DEFAULT_SKIN_ID } from '../data/skins';
import {
  addCoins,
  equipSkin,
  loadSave,
  recordResult,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  unlockSkin,
  type KVStorage,
} from './save';

function fakeStorage(initial: Record<string, string> = {}): KVStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('save', () => {
  it('빈 저장소는 기본값(schemaVersion 포함)', () => {
    const s = loadSave(fakeStorage());
    expect(s.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(s.stages).toEqual({});
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID]);
    expect(s.equippedSkin).toBe(DEFAULT_SKIN_ID);
  });

  it('결과 기록 후 로드하면 반영', () => {
    const st = fakeStorage();
    recordResult(st, 'stage_01', 88.5, 1, true);
    const s = loadSave(st);
    expect(s.stages['stage_01']).toEqual({ bestAverage: 88.5, bestStars: 1, cleared: true });
  });

  it('최고 평균·별점만 갱신(하락은 무시), cleared는 OR', () => {
    const st = fakeStorage();
    recordResult(st, 'stage_01', 95, 3, true);
    recordResult(st, 'stage_01', 70, 0, false); // 하락 시도
    const rec = loadSave(st).stages['stage_01'];
    expect(rec?.bestAverage).toBe(95);
    expect(rec?.bestStars).toBe(3);
    expect(rec?.cleared).toBe(true);
  });

  it('다른 스테이지는 독립', () => {
    const st = fakeStorage();
    recordResult(st, 'stage_01', 90, 2, true);
    recordResult(st, 'stage_02', 82, 1, false);
    const s = loadSave(st);
    expect(s.stages['stage_01']?.bestStars).toBe(2);
    expect(s.stages['stage_02']?.bestStars).toBe(1);
  });

  it('알 수 없는 스키마는 리셋', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({ schemaVersion: 999, stages: { x: {} } }),
    });
    expect(loadSave(st).stages).toEqual({});
  });

  it('깨진 JSON은 리셋', () => {
    const st = fakeStorage({ [SAVE_KEY]: '{not json' });
    expect(loadSave(st).stages).toEqual({});
  });

  it('v1 저장은 스테이지 기록을 보존하며 v3로 마이그레이션(coins=0, 스킨 기본값)', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({
        schemaVersion: 1,
        stages: { stage_01: { bestAverage: 91.2, bestStars: 2, cleared: true } },
      }),
    });
    const s = loadSave(st);
    expect(s.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(s.stages['stage_01']?.bestAverage).toBe(91.2);
    expect(s.coins).toBe(0);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID]);
    expect(s.equippedSkin).toBe(DEFAULT_SKIN_ID);
  });

  it('v2 저장은 기록·코인을 보존하며 v3로 마이그레이션(스킨 기본값)', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({
        schemaVersion: 2,
        stages: { stage_01: { bestAverage: 88, bestStars: 1, cleared: true } },
        coins: 42,
      }),
    });
    const s = loadSave(st);
    expect(s.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(s.stages['stage_01']?.bestAverage).toBe(88);
    expect(s.coins).toBe(42);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID]);
    expect(s.equippedSkin).toBe(DEFAULT_SKIN_ID);
  });

  it('v3 불변식 — ownedSkins에 기본 스킨이 없으면 추가된다', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({
        schemaVersion: 3,
        stages: {},
        coins: 5,
        ownedSkins: ['mint'],
        equippedSkin: 'mint',
      }),
    });
    const s = loadSave(st);
    expect(s.ownedSkins).toContain(DEFAULT_SKIN_ID);
    expect(s.equippedSkin).toBe('mint'); // 보유 스킨 장착은 유지
  });

  it('v3 불변식 — 미보유 equippedSkin은 기본 스킨으로 폴백', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({
        schemaVersion: 3,
        stages: {},
        coins: 5,
        ownedSkins: [],
        equippedSkin: 'golden', // 오염된 저장 — 보유하지 않은 스킨 장착
      }),
    });
    const s = loadSave(st);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID]);
    expect(s.equippedSkin).toBe(DEFAULT_SKIN_ID);
  });

  it('v3 저장에서 스킨 필드가 깨졌으면 기본값으로 복구(기록·코인은 보존)', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({
        schemaVersion: 3,
        stages: {},
        coins: 15,
        ownedSkins: 'not-an-array',
        equippedSkin: 7,
      }),
    });
    const s = loadSave(st);
    expect(s.coins).toBe(15);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID]);
    expect(s.equippedSkin).toBe(DEFAULT_SKIN_ID);
  });

  it('addCoins 적립·지출, 0 미만 방지', () => {
    const st = fakeStorage();
    expect(addCoins(st, 12).coins).toBe(12);
    expect(addCoins(st, -5).coins).toBe(7);
    expect(addCoins(st, -100).coins).toBe(0);
    expect(loadSave(st).coins).toBe(0);
  });

  it('recordResult는 coins·스킨 필드를 보존한다', () => {
    const st = fakeStorage();
    addCoins(st, 30);
    unlockSkin(st, 'mint');
    equipSkin(st, 'mint');
    recordResult(st, 'stage_01', 88, 1, true);
    const s = loadSave(st);
    expect(s.coins).toBe(30);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID, 'mint']);
    expect(s.equippedSkin).toBe('mint');
  });

  it('addCoins는 스킨 필드를 보존한다', () => {
    const st = fakeStorage();
    unlockSkin(st, 'golden');
    equipSkin(st, 'golden');
    addCoins(st, 10);
    const s = loadSave(st);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID, 'golden']);
    expect(s.equippedSkin).toBe('golden');
  });

  it('unlockSkin은 idempotent — 중복 추가되지 않는다', () => {
    const st = fakeStorage();
    unlockSkin(st, 'mint');
    const s = unlockSkin(st, 'mint');
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID, 'mint']);
    expect(loadSave(st).ownedSkins).toEqual([DEFAULT_SKIN_ID, 'mint']);
  });

  it('equipSkin은 보유 스킨만 장착, 미보유면 무변경', () => {
    const st = fakeStorage();
    expect(equipSkin(st, 'choco').equippedSkin).toBe(DEFAULT_SKIN_ID); // 미보유 → 무시
    unlockSkin(st, 'choco');
    expect(equipSkin(st, 'choco').equippedSkin).toBe('choco');
    expect(loadSave(st).equippedSkin).toBe('choco');
  });
});
