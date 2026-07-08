import { describe, expect, it } from 'vitest';
import type { EnemyDef } from './enemyDef';
import { EventInstance } from './eventInstance';

const DEF: EnemyDef = {
  id: 'spider',
  stageUnlock: 1,
  telegraphMs: 500,
  responseWindowMs: 1000,
  input: 'drag_cut',
  cooldownMs: [3000, 5000],
  maxConcurrent: 1,
  onSuccess: ['fx_web_flutter'],
  onFail: ['egg_bisect'],
};

describe('EventInstance — telegraph→window→resolve', () => {
  it('초기 TELEGRAPH, telegraphMs 경과 후 WINDOW', () => {
    const e = new EventInstance(DEF);
    expect(e.phase).toBe('TELEGRAPH');
    e.update(499);
    expect(e.phase).toBe('TELEGRAPH');
    e.update(1);
    expect(e.phase).toBe('WINDOW');
  });

  it('window 만료 시 자동 실패', () => {
    const e = new EventInstance(DEF);
    e.update(500 + 1000 - 1);
    expect(e.result).toBe('pending');
    e.update(1);
    expect(e.result).toBe('fail');
    expect(e.phase).toBe('RESOLVED');
  });

  it('window 중 일치 입력 = 성공', () => {
    const e = new EventInstance(DEF);
    e.update(600); // window
    expect(e.tryInput('drag_cut')).toBe(true);
    expect(e.result).toBe('success');
  });

  it('telegraph 중 입력은 무시', () => {
    const e = new EventInstance(DEF);
    e.update(200); // telegraph
    expect(e.tryInput('drag_cut')).toBe(false);
    expect(e.result).toBe('pending');
  });

  it('불일치 입력은 무시', () => {
    const e = new EventInstance(DEF);
    e.update(600);
    expect(e.tryInput('double_tap')).toBe(false);
    expect(e.result).toBe('pending');
  });

  it('resolve 이후 입력·시간 무시', () => {
    const e = new EventInstance(DEF);
    e.update(600);
    e.tryInput('drag_cut'); // success
    expect(e.tryInput('drag_cut')).toBe(false);
    e.update(5000);
    expect(e.result).toBe('success');
  });

  it('phaseProgress01 — telegraph/window 진행도', () => {
    const e = new EventInstance(DEF);
    e.update(250); // telegraph 절반
    expect(e.phaseProgress01).toBeCloseTo(0.5, 6);
    e.update(250 + 500); // window 절반 (telegraph 500 지나 window 500/1000)
    expect(e.phase).toBe('WINDOW');
    expect(e.phaseProgress01).toBeCloseTo(0.5, 6);
  });
});
