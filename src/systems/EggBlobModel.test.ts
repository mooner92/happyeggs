import { describe, expect, it } from 'vitest';
import { EGG, type BlobConfig } from '../data/balance';
import { createBlob, getPolygon, stepSpread } from './EggBlobModel';

const CFG: BlobConfig = EGG;

function meanRadius(verts: Float32Array, cx: number, cy: number): number {
  let sum = 0;
  const n = verts.length / 2;
  for (let i = 0; i < n; i++) {
    sum += Math.hypot(verts[i * 2]! - cx, verts[i * 2 + 1]! - cy);
  }
  return sum / n;
}

describe('EggBlobModel', () => {
  it('동일 시드 + 동일 dt 시퀀스 = 동일 verts (결정론)', () => {
    const a = createBlob(11, 100, 200);
    const b = createBlob(11, 100, 200);
    for (let i = 0; i < 60; i++) {
      stepSpread(a, 1 / 60);
      stepSpread(b, 1 / 60);
    }
    expect([...a.verts]).toEqual([...b.verts]);
  });

  it('다른 시드는 다른 형태를 낸다', () => {
    const a = createBlob(1, 0, 0);
    const b = createBlob(2, 0, 0);
    expect([...a.verts]).not.toEqual([...b.verts]);
  });

  it('정점 수 = VERTEX_COUNT, 전부 유한값', () => {
    const blob = createBlob(3, 0, 0);
    expect(blob.verts.length).toBe(CFG.VERTEX_COUNT * 2);
    expect([...blob.verts].every(Number.isFinite)).toBe(true);
  });

  it('평균 반경이 단조 증가하고 정점 반경이 MAX_RADIUS를 넘지 않는다', () => {
    const blob = createBlob(5, 0, 0);
    let prev = meanRadius(blob.verts, 0, 0);
    for (let i = 0; i < 120; i++) {
      stepSpread(blob, 0.1);
      const cur = meanRadius(blob.verts, 0, 0);
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-4);
      prev = cur;
      for (const p of getPolygon(blob)) {
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(CFG.MAX_RADIUS + 1e-3);
      }
    }
    // SPREAD_SECONDS 경과 후 수렴 — 더 이상 증가하지 않는다
    const settled = meanRadius(blob.verts, 0, 0);
    stepSpread(blob, 1);
    expect(meanRadius(blob.verts, 0, 0)).toBeCloseTo(settled, 5);
  });

  it('이웃 정점 반경 차에 상한이 있다 (스무딩 — 스파이크 없음)', () => {
    for (const seed of [1, 7, 42, 999]) {
      const blob = createBlob(seed, 0, 0);
      stepSpread(blob, CFG.SPREAD_SECONDS); // 최대로 퍼진 상태에서 검사
      const n = CFG.VERTEX_COUNT;
      for (let i = 0; i < n; i++) {
        const r0 = Math.hypot(blob.verts[i * 2]!, blob.verts[i * 2 + 1]!);
        const j = (i + 1) % n;
        const r1 = Math.hypot(blob.verts[j * 2]!, blob.verts[j * 2 + 1]!);
        expect(Math.abs(r1 - r0)).toBeLessThanOrEqual(blob.baseRadius * CFG.NOISE_AMP);
      }
    }
  });

  it('stepSpread는 verts 버퍼를 재사용한다 (per-frame 할당 금지 계약)', () => {
    const blob = createBlob(8, 0, 0);
    const ref = blob.verts;
    stepSpread(blob, 0.5);
    stepSpread(blob, 0.5);
    expect(blob.verts).toBe(ref);
  });

  it('getPolygon은 각도 순서를 보존한다 (M1 채점 전제)', () => {
    const blob = createBlob(13, 50, 50);
    stepSpread(blob, 1);
    const poly = getPolygon(blob);
    expect(poly.length).toBe(CFG.VERTEX_COUNT);
    const TAU = Math.PI * 2;
    for (let i = 0; i < poly.length; i++) {
      const expected = (i / poly.length) * TAU;
      const actual = Math.atan2(poly[i]!.y - 50, poly[i]!.x - 50);
      // 원형 거리로 비교 — ±π 경계에서도 안전
      const raw = Math.abs(actual - expected) % TAU;
      const circular = Math.min(raw, TAU - raw);
      expect(circular).toBeLessThanOrEqual(1e-3);
    }
  });

  it('노른자는 중심 근처의 원이다 (오프셋 상한 준수)', () => {
    for (const seed of [1, 2, 3, 100]) {
      const blob = createBlob(seed, 10, 20);
      const dist = Math.hypot(blob.yolk.x - 10, blob.yolk.y - 20);
      expect(dist).toBeLessThanOrEqual(CFG.YOLK_OFFSET_RATIO * CFG.INITIAL_RADIUS * Math.SQRT2 + 1e-6);
      expect(blob.yolk.r).toBeCloseTo(CFG.INITIAL_RADIUS * CFG.YOLK_RADIUS_RATIO, 6);
    }
  });

  it('dt ≤ 0 은 no-op', () => {
    const blob = createBlob(4, 0, 0);
    const before = [...blob.verts];
    stepSpread(blob, 0);
    stepSpread(blob, -1);
    expect([...blob.verts]).toEqual(before);
  });
});
