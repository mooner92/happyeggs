// 계란 블롭 순수 모델 (GDD §6.1) — 방사형 정점 폴리곤, 시드 노이즈 + 이웃 스무딩으로 퍼짐.
// 정점 배열은 in-place 갱신(per-frame 할당 0)하며, 이 배열이 그대로 M1 원형도 채점의 입력이 된다.
import { EGG, type BlobConfig } from '../data/balance';
import { createNoise1D } from './noise';

export interface Yolk {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface BlobState {
  readonly seed: number;
  readonly cx: number;
  readonly cy: number;
  /** 정점별 형태 계수 [-1,1] (노이즈+스무딩 결과, 시간 불변) */
  readonly shape: Float32Array;
  /** 화면 좌표 (x0,y0,x1,y1,…) — stepSpread가 in-place 갱신, 재할당 금지 */
  readonly verts: Float32Array;
  readonly yolk: Yolk;
  /** 경과 시간(초) */
  elapsed: number;
  /** 현재 기준 반경 — 노이즈 진폭 포함 최대 정점 반경이 MAX_RADIUS를 넘지 않게 성장 */
  baseRadius: number;
}

/** 노이즈 포함 최대 정점 반경이 MAX_RADIUS가 되는 기준 반경 상한 */
function baseRadiusMax(cfg: BlobConfig): number {
  return cfg.MAX_RADIUS / (1 + cfg.NOISE_AMP);
}

function writeVerts(blob: BlobState, cfg: BlobConfig): void {
  const n = cfg.VERTEX_COUNT;
  for (let i = 0; i < n; i++) {
    const r = blob.baseRadius * (1 + cfg.NOISE_AMP * blob.shape[i]!);
    const angle = (i / n) * Math.PI * 2;
    blob.verts[i * 2] = blob.cx + Math.cos(angle) * r;
    blob.verts[i * 2 + 1] = blob.cy + Math.sin(angle) * r;
  }
}

export function createBlob(seed: number, cx: number, cy: number, cfg: BlobConfig = EGG): BlobState {
  const n = cfg.VERTEX_COUNT;
  const noise = createNoise1D(seed);

  // 정점별 형태 계수 — 링 위 노이즈 샘플 후 원형(wrap) 이웃 스무딩
  const shape = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    shape[i] = noise((i / n) * cfg.NOISE_FREQ);
  }
  for (let pass = 0; pass < cfg.SMOOTHING_PASSES; pass++) {
    const prev = Float32Array.from(shape);
    for (let i = 0; i < n; i++) {
      const left = prev[(i - 1 + n) % n]!;
      const right = prev[(i + 1) % n]!;
      shape[i] = (prev[i]! + (left + right) / 2) / 2;
    }
  }

  // 노른자 — 중심 근처 원, 시드 기반 오프셋 (M0는 렌더만, 파손 로직은 M1+)
  const yolkNoise = createNoise1D(seed ^ 0x5eed);
  const maxOffset = cfg.YOLK_OFFSET_RATIO * cfg.INITIAL_RADIUS;
  const yolk: Yolk = {
    x: cx + yolkNoise(0.25) * maxOffset,
    y: cy + yolkNoise(7.75) * maxOffset,
    r: cfg.INITIAL_RADIUS * cfg.YOLK_RADIUS_RATIO,
  };

  const blob: BlobState = {
    seed,
    cx,
    cy,
    shape,
    verts: new Float32Array(n * 2),
    yolk,
    elapsed: 0,
    baseRadius: Math.min(cfg.INITIAL_RADIUS, baseRadiusMax(cfg)),
  };
  writeVerts(blob, cfg);
  return blob;
}

/** 흰자 퍼짐 한 스텝 — verts를 in-place 갱신한다 */
export function stepSpread(blob: BlobState, dtSec: number, cfg: BlobConfig = EGG): void {
  if (dtSec <= 0 || !Number.isFinite(dtSec)) return;
  blob.elapsed += dtSec;
  const t = Math.min(blob.elapsed / cfg.SPREAD_SECONDS, 1);
  const max = baseRadiusMax(cfg);
  blob.baseRadius = Math.min(cfg.INITIAL_RADIUS, max) + (max - Math.min(cfg.INITIAL_RADIUS, max)) * t;
  writeVerts(blob, cfg);
}

/**
 * 폴리곤 정점(각도 순서 보존) — 테스트·M1 채점용.
 * 매 호출 새 배열을 만들므로 렌더 핫패스에서 호출 금지 (뷰는 blob.verts를 직접 읽는다).
 */
export function getPolygon(blob: BlobState): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < blob.verts.length; i += 2) {
    out.push({ x: blob.verts[i]!, y: blob.verts[i + 1]! });
  }
  return out;
}
