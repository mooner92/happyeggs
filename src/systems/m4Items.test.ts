// M4 아이템/신규 적 — 데이터 무결성 + 아이템 탭 라우팅(순수). GDD §8.1 ③④⑤⑥ · §9.
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../data/enemies';
import { ITEMS, ITEM_POS } from '../data/items';
import { SCORE } from '../data/balance';
import type { InputKey } from './enemyDef';
import { EventScheduler, type RangeRng } from './eventScheduler';

const rngMin: RangeRng = (min) => min;
const GAP: readonly [number, number] = [100, 100];

describe('M4 신규 적 정의', () => {
  const byId = new Map(ENEMIES.map((e) => [e.id, e]));

  it('재채기·머리카락·파리·저격수 아이템 입력 키가 스키마에 있다', () => {
    expect(byId.get('sneeze_troll')?.input).toBe('lid');
    expect(byId.get('hair_troll')?.input).toBe('torch');
    expect(byId.get('fly')?.input).toBe('tap');
  });

  it('재채기 실패는 즉시 게임 오버 이펙트를 낸다 (DECISION-01)', () => {
    expect(byId.get('sneeze_troll')?.onFail).toContain('game_over_sneeze');
  });

  it('머리카락 실패는 안착 감점, 파리 실패는 똥 감점', () => {
    expect(byId.get('hair_troll')?.onFail).toContain('hair_land');
    expect(byId.get('fly')?.onFail).toContain('fly_poop');
  });
});

describe('M4 아이템 데이터', () => {
  it('정답 아이템은 대응 적을, decoy는 correctFor=null + 개그를 가진다', () => {
    expect(ITEMS.lid?.correctFor).toBe('sneeze_troll');
    expect(ITEMS.torch?.correctFor).toBe('hair_troll');
    expect(ITEMS.fencing_sword?.correctFor).toBe('sniper');
    expect(ITEMS.shield_decoy?.correctFor).toBeNull();
    expect(ITEMS.shield_decoy?.failGag).toBeTruthy();
  });

  it('정답 아이템 id는 대응 적의 input 키와 일치한다 (탭 라우팅 근거)', () => {
    const byId = new Map(ENEMIES.map((e) => [e.id, e]));
    for (const item of Object.values(ITEMS)) {
      if (item.correctFor === null) continue;
      const enemy = byId.get(item.correctFor);
      if (!enemy) continue; // 저격수는 아직 미구현일 수 있음
      expect(enemy.input).toBe(item.id as InputKey);
    }
  });

  it('모든 배치 위치 키가 좌표를 가진다', () => {
    for (const key of Object.keys(ITEM_POS)) {
      expect(ITEM_POS[key]!.x).toBeGreaterThanOrEqual(0);
      expect(ITEM_POS[key]!.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('M4 아이템 탭 라우팅 (scheduler)', () => {
  it('뚜껑 탭(lid)이 window 중 재채기 손님을 성공 처리한다', () => {
    const sneeze = ENEMIES.find((e) => e.id === 'sneeze_troll')!;
    const s = new EventScheduler([sneeze], 1, 5, rngMin, 1, GAP);
    s.update(100, true); // spawn (TELEGRAPH)
    s.update(sneeze.telegraphMs + 50, false); // → WINDOW
    expect(s.active[0]?.phase).toBe('WINDOW');
    const hit = s.tryInput('lid');
    expect(hit?.def.id).toBe('sneeze_troll');
    expect(hit?.result).toBe('success');
  });

  it('틀린 아이템 키(torch)는 재채기를 처리하지 못한다', () => {
    const sneeze = ENEMIES.find((e) => e.id === 'sneeze_troll')!;
    const s = new EventScheduler([sneeze], 1, 5, rngMin, 1, GAP);
    s.update(100, true);
    s.update(sneeze.telegraphMs + 50, false);
    expect(s.tryInput('torch')).toBeNull();
    expect(s.active[0]?.phase).toBe('WINDOW'); // 여전히 대응 대기
  });
});

describe('M4 감점 수치 (GDD §6.1)', () => {
  it('머리카락 −10, 파리 똥 −20, 총알 구멍 −12', () => {
    expect(SCORE.deduction.hair).toBe(-10);
    expect(SCORE.deduction.flyPoop).toBe(-20);
    expect(SCORE.deduction.bulletHole).toBe(-12);
  });
});

describe('M4 저격수 (GDD §8.1 ⑤)', () => {
  const sniper = ENEMIES.find((e) => e.id === 'sniper');

  it('펜싱칼 입력 + 성공=반사 / 실패=구멍', () => {
    expect(sniper?.input).toBe('fencing_sword');
    expect(sniper?.onSuccess).toContain('fx_parry_reflect');
    expect(sniper?.onFail).toContain('bullet_hole');
  });

  it('stageUnlock 2 — stage 1에선 랜덤 스폰 안 됨', () => {
    const s = new EventScheduler([sniper!], 20, 1, rngMin, 1, GAP); // stage 1
    const seen = new Set<string>();
    for (let t = 0; t < 4000; t += 100) {
      for (const inst of s.update(100, true).spawned) seen.add(inst.def.id);
    }
    expect(seen.has('sniper')).toBe(false);
  });

  it('펜싱칼 탭(fencing_sword)이 window 중 저격수를 성공 처리', () => {
    const s = new EventScheduler([sniper!], 1, 5, rngMin, 2, GAP); // stage 2
    s.update(100, true);
    s.update(sniper!.telegraphMs + 50, false);
    expect(s.active[0]?.phase).toBe('WINDOW');
    const hit = s.tryInput('fencing_sword');
    expect(hit?.def.id).toBe('sniper');
    expect(hit?.result).toBe('success');
  });
});
