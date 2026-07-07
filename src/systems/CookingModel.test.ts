import { describe, expect, it } from 'vitest';
import { COOK, HEAT, type CookThresholds } from '../data/balance';
import { COOK_STATES, CookingModel, donenessToState } from './CookingModel';

const GAS = HEAT.gas.base; // 1.0

describe('donenessToState — 경계값 (닫힌 하한 ≥)', () => {
  const boundaries: [keyof CookThresholds, string][] = [
    ['SET_AT', 'SET'],
    ['PERFECT_START', 'PERFECT_WINDOW'],
    ['PERFECT_END', 'OVERDONE'],
    ['BURNT_AT', 'BURNT'],
    ['SMOKE_AT', 'SMOKE'],
  ];
  it.each(boundaries)('%s 직전은 이전 상태, 정확히 그 값부터 %s', (key, state) => {
    const at = COOK[key];
    expect(donenessToState(at)).toBe(state);
    expect(donenessToState(at - 1e-9)).not.toBe(state);
  });
});

describe('CookingModel', () => {
  it('초기 상태 RAW, doneness 0', () => {
    const m = new CookingModel();
    expect(m.state).toBe('RAW');
    expect(m.doneness).toBe(0);
  });

  it('가스(1.0) 기준 전 구간 단방향 통과: RAW→SET→PERFECT_WINDOW→OVERDONE→BURNT→SMOKE', () => {
    const m = new CookingModel();
    const seen = ['RAW' as string];
    for (let i = 0; i < COOK.SMOKE_AT * 60 + 60; i++) {
      m.update(1 / 60, GAS);
      if (m.state !== seen[seen.length - 1]) seen.push(m.state);
    }
    expect(seen).toEqual([...COOK_STATES]);
  });

  it('dt 분할 불변성 — 1000ms×1회 == 10ms×100회', () => {
    const once = new CookingModel();
    const split = new CookingModel();
    const onceTr = once.update(1, GAS);
    const splitTr: string[] = [];
    for (let i = 0; i < 100; i++) splitTr.push(...split.update(0.01, GAS));
    expect(split.doneness).toBeCloseTo(once.doneness, 9);
    expect(split.state).toBe(once.state);
    expect(splitTr).toEqual(onceTr);
  });

  it.each([['induction', 0.8], ['brazier', 1.3], ['lava', 2.5]] as const)(
    '열원 계수 스케일링 — %s(%f)는 SET 도달 시간이 SET_AT/계수',
    (id, coeff) => {
      expect(HEAT[id].base).toBe(coeff);
      const m = new CookingModel();
      const need = COOK.SET_AT / coeff;
      m.update(need * 0.999, coeff);
      expect(m.state).toBe('RAW');
      m.update(need * 0.002, coeff);
      expect(m.state).toBe('SET');
    },
  );

  it('heatCoeff = 0이면 doneness가 정지한다 (M5 불 끄기 대비)', () => {
    const m = new CookingModel();
    m.update(COOK.SET_AT, GAS); // SET 진입
    const d = m.doneness;
    m.update(100, 0);
    expect(m.doneness).toBe(d);
    expect(m.state).toBe('SET');
  });

  it('상태는 어떤 dt 시퀀스에서도 역행하지 않는다 (단조성)', () => {
    const m = new CookingModel();
    // 결정적 의사난수 dt 시퀀스
    let x = 123456789;
    const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff), x / 0x7fffffff);
    let prevIdx = 0;
    for (let i = 0; i < 500; i++) {
      m.update(rnd() * 0.2, rnd() * 2.5);
      const idx = COOK_STATES.indexOf(m.state);
      expect(idx).toBeGreaterThanOrEqual(prevIdx);
      prevIdx = idx;
    }
  });

  it('큰 dt 1회로 다중 임계를 통과해도 전이 목록이 무손실이다', () => {
    const m = new CookingModel();
    const transitions = m.update(COOK.SMOKE_AT + 1, GAS);
    expect(transitions).toEqual(['SET', 'PERFECT_WINDOW', 'OVERDONE', 'BURNT', 'SMOKE']);
  });

  it('SMOKE 진입 후 SPRINKLER_DELAY 경과 시 smokeCritical이 정확히 1회 발화한다', () => {
    const m = new CookingModel();
    m.update(COOK.SMOKE_AT, GAS); // 정확히 SMOKE 진입 (경과 0)
    expect(m.state).toBe('SMOKE');
    m.update(COOK.SPRINKLER_DELAY - 0.001, GAS);
    expect(m.smokeCriticalFired).toBe(false);
    m.update(0.001, GAS);
    expect(m.smokeCriticalFired).toBe(true);
    // 이후에도 true 유지 (재발화 없음 — 플래그 단조)
    m.update(10, GAS);
    expect(m.smokeCriticalFired).toBe(true);
  });

  it('SMOKE 유예는 실시간이다 — 불을 꺼도(계수 0) 진행된다 (ADR-0005)', () => {
    const m = new CookingModel();
    m.update(COOK.SMOKE_AT, GAS);
    m.update(COOK.SPRINKLER_DELAY, 0); // 열원 꺼짐 — doneness 정지, 연기는 계속
    expect(m.smokeCriticalFired).toBe(true);
  });

  it('SMOKE 진입 틱에서는 진입 이후 경과분만 유예에 가산된다', () => {
    const m = new CookingModel();
    // 한 번의 큰 dt로 SMOKE_AT + 1초 지점까지 — 유예 경과는 1초여야 한다
    m.update(COOK.SMOKE_AT + 1, GAS);
    expect(m.smokeElapsed).toBeCloseTo(1, 9);
  });

  it('dt ≤ 0 은 no-op', () => {
    const m = new CookingModel();
    expect(m.update(0, GAS)).toEqual([]);
    expect(m.update(-1, GAS)).toEqual([]);
    expect(m.doneness).toBe(0);
  });

  it('커스텀 임계값 주입이 그대로 반영된다 (밸런스 파라미터화)', () => {
    const cfg: CookThresholds = {
      SET_AT: 1,
      PERFECT_START: 2,
      PERFECT_END: 3,
      BURNT_AT: 4,
      SMOKE_AT: 5,
      SPRINKLER_DELAY: 0.5,
    };
    const m = new CookingModel(cfg);
    m.update(1, GAS);
    expect(m.state).toBe('SET');
    m.update(4, GAS);
    expect(m.state).toBe('SMOKE');
    m.update(0.5, GAS);
    expect(m.smokeCriticalFired).toBe(true);
  });

  it('progressInState — 구간 내 0~1 진행도', () => {
    const m = new CookingModel();
    expect(m.progressInState).toBe(0);
    m.update(COOK.SET_AT / 2, GAS);
    expect(m.progressInState).toBeCloseTo(0.5, 9);
    m.update(COOK.SET_AT / 2, GAS); // 정확히 SET 진입
    expect(m.state).toBe('SET');
    expect(m.progressInState).toBeCloseTo(0, 9);
  });
});
