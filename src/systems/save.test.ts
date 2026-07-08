import { describe, expect, it } from 'vitest';
import {
  loadSave,
  recordResult,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
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

  it('스키마 불일치는 리셋', () => {
    const st = fakeStorage({
      [SAVE_KEY]: JSON.stringify({ schemaVersion: 999, stages: { x: {} } }),
    });
    expect(loadSave(st).stages).toEqual({});
  });

  it('깨진 JSON은 리셋', () => {
    const st = fakeStorage({ [SAVE_KEY]: '{not json' });
    expect(loadSave(st).stages).toEqual({});
  });
});
