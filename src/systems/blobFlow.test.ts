// 흰자 드리프트 + 뒤집개 밀기 (ADR-0012) — 원형도가 운이 아니라 스킬이 되는 코어 확장. 순수.
import { describe, expect, it } from 'vitest';
import { FLOW } from '../data/balance';
import { bulgePoint, createBlob, getPolygon, pushBlob, stepDrift, stepSpread } from './EggBlobModel';
import { circularity } from './scoring';

const SEED = 4242;

/** dt 스텝으로 spread+drift를 sec초 진행 */
function cook(blob: ReturnType<typeof createBlob>, sec: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < sec; t += dt) {
    stepSpread(blob, dt);
    stepDrift(blob, dt);
  }
}

describe('stepDrift', () => {
  it('방치하면 한쪽이 불룩해져 원형도가 떨어진다', () => {
    const still = createBlob(SEED, 0, 0);
    const drifted = createBlob(SEED, 0, 0);
    const dt = 1 / 60;
    for (let t = 0; t < 4; t += dt) {
      stepSpread(still, dt);
      stepSpread(drifted, dt);
      stepDrift(drifted, dt);
    }
    const qStill = circularity(getPolygon(still));
    const qDrift = circularity(getPolygon(drifted));
    expect(qDrift).toBeLessThan(qStill);
  });

  it('flow는 maxOutPx를 넘지 않는다', () => {
    const blob = createBlob(SEED, 0, 0);
    cook(blob, 30); // 과잉 드리프트
    for (let i = 0; i < blob.flow.length; i++) {
      expect(blob.flow[i]!).toBeLessThanOrEqual(FLOW.maxOutPx + 1e-6);
      expect(Number.isFinite(blob.flow[i]!)).toBe(true);
    }
  });

  it('동일 시드 = 동일 드리프트 (결정론)', () => {
    const a = createBlob(SEED, 0, 0);
    const b = createBlob(SEED, 0, 0);
    cook(a, 3);
    cook(b, 3);
    expect(Array.from(a.flow)).toEqual(Array.from(b.flow));
  });
});

describe('pushBlob', () => {
  it('불룩한 곳을 밀면 원형도가 회복된다', () => {
    const blob = createBlob(SEED, 0, 0);
    cook(blob, 4);
    const before = circularity(getPolygon(blob));
    // 가장 불룩한 지점을 3번 톡톡
    for (let k = 0; k < 3; k++) {
      const b = bulgePoint(blob, 0);
      expect(b).not.toBeNull();
      const touched = pushBlob(blob, b!.x, b!.y);
      expect(touched).toBeGreaterThan(0);
    }
    const after = circularity(getPolygon(blob));
    expect(after).toBeGreaterThan(before);
  });

  it('빈 곳 탭은 헛스윙(0) — 블롭이 안 변한다', () => {
    const blob = createBlob(SEED, 0, 0);
    cook(blob, 2);
    const snapshot = Array.from(blob.verts);
    const touched = pushBlob(blob, 800, 800); // 블롭에서 먼 곳
    expect(touched).toBe(0);
    expect(Array.from(blob.verts)).toEqual(snapshot);
  });

  it('같은 곳을 계속 밀어도 maxInPx 아래로 패이지 않는다', () => {
    const blob = createBlob(SEED, 0, 0);
    cook(blob, 2);
    const b = bulgePoint(blob, 0)!;
    for (let k = 0; k < 20; k++) pushBlob(blob, b.x, b.y);
    for (let i = 0; i < blob.flow.length; i++) {
      expect(blob.flow[i]!).toBeGreaterThanOrEqual(-FLOW.maxInPx - 1e-6);
    }
  });
});

describe('bulgePoint', () => {
  it('임계 미만이면 null, 드리프트 후엔 불룩 지점 반환', () => {
    const blob = createBlob(SEED, 0, 0);
    expect(bulgePoint(blob, FLOW.hintBulgePx)).toBeNull(); // 갓 깬 계란
    cook(blob, 4);
    const b = bulgePoint(blob, FLOW.hintBulgePx);
    expect(b).not.toBeNull();
    expect(b!.flow).toBeGreaterThan(FLOW.hintBulgePx);
  });
});
