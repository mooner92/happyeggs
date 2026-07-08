import { describe, expect, it } from 'vitest';
import type { EnemyDef } from './enemyDef';
import { EventScheduler, type RangeRng } from './eventScheduler';

function def(over: Partial<EnemyDef> = {}): EnemyDef {
  return {
    id: 'A',
    stageUnlock: 1,
    telegraphMs: 100,
    responseWindowMs: 100,
    input: 'drag_cut',
    cooldownMs: [1000, 1000],
    maxConcurrent: 5,
    onSuccess: [],
    onFail: [],
    ...over,
  };
}

/** 항상 최소값 반환 → 결정론 (스폰 간격 = spawnGap[0], 후보 pick = 0) */
const rngMin: RangeRng = (min) => min;
const GAP: readonly [number, number] = [100, 100];

describe('EventScheduler', () => {
  it('조리 중이 아니면 스폰하지 않는다', () => {
    const s = new EventScheduler([def()], 5, 5, rngMin, 1, GAP);
    for (let i = 0; i < 10; i++) s.update(100, false);
    expect(s.active.length).toBe(0);
    expect(s.budgetLeft).toBe(5);
  });

  it('조리 중이면 스폰한다', () => {
    const s = new EventScheduler([def()], 5, 5, rngMin, 1, GAP);
    const r = s.update(100, true);
    expect(r.spawned.length).toBe(1);
    expect(s.active.length).toBe(1);
    expect(s.budgetLeft).toBe(4);
  });

  it('eventBudget 소진 후 스폰 정지', () => {
    const s = new EventScheduler([def()], 2, 5, rngMin, 1, GAP);
    s.update(100, true); // spawn1 budget→1
    s.update(100, true); // spawn2 budget→0
    expect(s.budgetLeft).toBe(0);
    s.update(100, true); // 정지
    s.update(100, true);
    expect(s.budgetLeft).toBe(0);
    // 스폰은 2회뿐 (해소로 일부 제거됐을 수 있음)
    expect(s.active.length).toBeLessThanOrEqual(2);
  });

  it('전역 maxConcurrent 준수 (=1이면 동시 1개)', () => {
    const s = new EventScheduler([def()], 10, 1, rngMin, 1, GAP);
    s.update(100, true); // spawn1
    s.update(100, true); // liveTotal 1 → 스폰 안 됨
    expect(s.active.filter((i) => !i.isResolved).length).toBe(1);
  });

  it('cooldown 준수 — 해소 후 재등장까지 대기', () => {
    const s = new EventScheduler([def({ cooldownMs: [500, 500] })], 10, 1, rngMin, 1, GAP);
    // spawn → telegraph100+window100=200 후 fail 해소, cooldown 500
    let spawns = 0;
    for (let t = 0; t < 600; t += 100) spawns += s.update(100, true).spawned.length;
    expect(spawns).toBe(1); // cooldown 때문에 600ms 안에 1회만
  });

  it('stageUnlock 필터 — 미해금 적은 안 나온다', () => {
    const pool = [def({ id: 'A', stageUnlock: 1 }), def({ id: 'B', stageUnlock: 3 })];
    const s = new EventScheduler(pool, 20, 1, rngMin, 1, GAP); // stage 1
    const seen = new Set<string>();
    for (let t = 0; t < 3000; t += 100) {
      for (const inst of s.update(100, true).spawned) seen.add(inst.def.id);
    }
    expect(seen.has('A')).toBe(true);
    expect(seen.has('B')).toBe(false);
  });

  it('resolve된 인스턴스는 active에서 제거된다', () => {
    const s = new EventScheduler([def()], 1, 5, rngMin, 1, GAP);
    s.update(100, true); // spawn
    for (let t = 0; t < 300; t += 100) s.update(100, true); // window 만료
    expect(s.active.length).toBe(0);
  });

  it('tryInput은 window 중 인스턴스에 성공 전달', () => {
    const s = new EventScheduler([def()], 1, 5, rngMin, 1, GAP);
    s.update(100, true); // spawn (elapsed 0 → TELEGRAPH)
    s.update(150, false); // telegraph(100) 지나 window로 (조리 정지라 추가 스폰 없음)
    expect(s.active[0]?.phase).toBe('WINDOW');
    const hit = s.tryInput('drag_cut');
    expect(hit).not.toBeNull();
    expect(hit?.result).toBe('success');
  });

  it('동일 시드 = 동일 스폰 순서 (결정론)', () => {
    const pool = [def({ id: 'A' }), def({ id: 'B', input: 'double_tap' })];
    const mk = () => new EventScheduler(pool, 5, 3, rngMin, 1, GAP);
    const run = (s: EventScheduler) => {
      const ids: string[] = [];
      for (let t = 0; t < 2000; t += 100) {
        for (const inst of s.update(100, true).spawned) ids.push(inst.def.id);
      }
      return ids;
    };
    expect(run(mk())).toEqual(run(mk()));
  });
});
