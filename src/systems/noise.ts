// 시드 기반 1D 밸류 노이즈 (ADR-0007 — GDD §6.1 "Perlin" 표기의 구현체).
// 정수 격자에 해시 값을 놓고 smoothstep으로 보간한다. 동일 시드 = 동일 출력(결정론).

/** 정수 격자점 해시 → [0, 1) */
function hash01(seed: number, n: number): number {
  let h = Math.imul(n | 0, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  h ^= h >>> 15;
  return (h >>> 0) / 0x100000000;
}

export type Noise1D = (t: number) => number;

/** 출력 범위 [-1, 1], t에 대해 연속 */
export function createNoise1D(seed: number): Noise1D {
  return (t: number): number => {
    const i0 = Math.floor(t);
    const f = t - i0;
    const v0 = hash01(seed, i0) * 2 - 1;
    const v1 = hash01(seed, i0 + 1) * 2 - 1;
    const u = f * f * (3 - 2 * f); // smoothstep
    return v0 + (v1 - v0) * u;
  };
}
