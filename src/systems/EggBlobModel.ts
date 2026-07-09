// 계란 블롭 순수 모델 (GDD §6.1) — 방사형 정점 폴리곤, 시드 노이즈 + 이웃 스무딩으로 퍼짐.
// 정점 배열은 in-place 갱신(per-frame 할당 0)하며, 이 배열이 그대로 M1 원형도 채점의 입력이 된다.
// + 흐름(드리프트)/뒤집개 밀기 (DECISION-10/ADR-0012): 정점별 반경 오프셋 flow로 표현 —
//   흰자가 한쪽으로 흘러 불룩해지고, 가장자리를 밀면 중심으로 들어온다. 물리엔진 없이 순수·결정론.
import { EGG, FLOW, type BlobConfig } from '../data/balance';
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
  /** 정점별 흐름 반경 오프셋(px) — 드리프트가 키우고 밀기가 줄인다 (ADR-0012) */
  readonly flow: Float32Array;
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
    const r = blob.baseRadius * (1 + cfg.NOISE_AMP * blob.shape[i]!) + blob.flow[i]!;
    const angle = (i / n) * Math.PI * 2;
    blob.verts[i * 2] = blob.cx + Math.cos(angle) * r;
    blob.verts[i * 2 + 1] = blob.cy + Math.sin(angle) * r;
  }
}

export function createBlob(seed: number, cx: number, cy: number, cfg: BlobConfig = EGG): BlobState {
  const n = cfg.VERTEX_COUNT;
  const noise = createNoise1D(seed);

  // 정점별 형태 계수 — 링을 노이즈 도메인에서 닫는다.
  // 1D 밸류 노이즈는 비주기라 t=0과 t=FREQ가 무관 → 각도 0에 이음매가 생긴다.
  // noise(t)와 noise(t−FREQ)를 w=t/FREQ로 블렌드해 seam 양끝을 noise(0)으로 일치시킨다.
  const F = cfg.NOISE_FREQ;
  const shape = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * F;
    const w = t / F; // = i/n
    shape[i] = noise(t) * (1 - w) + noise(t - F) * w;
  }
  // 이후 원형(wrap) 이웃 스무딩
  for (let pass = 0; pass < cfg.SMOOTHING_PASSES; pass++) {
    const prev = Float32Array.from(shape);
    for (let i = 0; i < n; i++) {
      const left = prev[(i - 1 + n) % n]!;
      const right = prev[(i + 1) % n]!;
      shape[i] = (prev[i]! + (left + right) / 2) / 2;
    }
  }

  // 노른자 — 중심 근처 원, 시드 기반 오프셋 (M0는 렌더만, 파손 로직은 M1+).
  // 각도+거리로 샘플해 유클리드 오프셋이 maxOffset을 넘지 않게 한다(원판 상한).
  const yolkNoise = createNoise1D(seed ^ 0x5eed);
  const maxOffset = cfg.YOLK_OFFSET_RATIO * cfg.INITIAL_RADIUS;
  const yolkAngle = yolkNoise(0.25) * Math.PI; // [-π, π]
  const yolkDist = Math.abs(yolkNoise(7.75)) * maxOffset; // [0, maxOffset]
  const yolk: Yolk = {
    x: cx + Math.cos(yolkAngle) * yolkDist,
    y: cy + Math.sin(yolkAngle) * yolkDist,
    r: cfg.INITIAL_RADIUS * cfg.YOLK_RADIUS_RATIO,
  };

  const blob: BlobState = {
    seed,
    cx,
    cy,
    shape,
    verts: new Float32Array(n * 2),
    yolk,
    flow: new Float32Array(n),
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

/** 각도 차를 [-π, π]로 정규화 */
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * 흰자 드리프트 한 스텝 (ADR-0012) — 시드 위상에서 천천히 도는 방향으로 흰자가 흘러
 * 그쪽 정점들의 flow가 자란다(cos 폴오프). 방치하면 불룩해져 원형도가 떨어진다.
 * 마지막에 flow 이웃 스무딩 1패스 — 밀린 자국·불룩이 자연스럽게 퍼진다.
 */
export function stepDrift(blob: BlobState, dtSec: number, cfg: BlobConfig = EGG): void {
  if (dtSec <= 0 || !Number.isFinite(dtSec)) return;
  const n = cfg.VERTEX_COUNT;
  // 드리프트 방향 — 시드 위상 + 시간 회전 (결정론)
  const phase = ((blob.seed % 628) / 628) * Math.PI * 2;
  const theta = phase + (blob.elapsed / FLOW.driftRotatePeriodSec) * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const d = Math.abs(angleDiff(angle, theta));
    if (d < FLOW.driftHalfWidthRad) {
      const falloff = Math.cos((d / FLOW.driftHalfWidthRad) * (Math.PI / 2));
      blob.flow[i] = Math.min(FLOW.maxOutPx, blob.flow[i]! + FLOW.driftPxPerSec * falloff * dtSec);
    }
  }
  // 이웃 스무딩 (wrap) — in-place, 이전 값 스냅샷 없이 가벼운 확산으로 충분
  const s = FLOW.smooth * Math.min(1, dtSec * 10);
  for (let i = 0; i < n; i++) {
    const left = blob.flow[(i - 1 + n) % n]!;
    const right = blob.flow[(i + 1) % n]!;
    blob.flow[i] = blob.flow[i]! * (1 - s) + ((left + right) / 2) * s;
  }
}

/**
 * 뒤집개 밀기 (ADR-0012) — (x,y) 근처 정점들을 중심 쪽으로 민다(flow 감소, 거리 폴오프).
 * 과하게 밀면 움푹 패인다(maxInPx) — 세게 누르기만 하면 되는 게 아니라 원형도 스킬이 된다.
 * 반환: 밀린 정점 수 (0이면 헛스윙).
 */
export function pushBlob(
  blob: BlobState,
  x: number,
  y: number,
  cfg: BlobConfig = EGG,
): number {
  const n = cfg.VERTEX_COUNT;
  let touched = 0;
  for (let i = 0; i < n; i++) {
    const vx = blob.verts[i * 2]!;
    const vy = blob.verts[i * 2 + 1]!;
    const d = Math.hypot(vx - x, vy - y);
    if (d < FLOW.pushRadiusPx) {
      const falloff = 1 - d / FLOW.pushRadiusPx;
      const cur = blob.flow[i]!;
      // 비례 감쇠: 불룩(+flow)은 자기 크기에 비례해 깎인다(크레이터 방지).
      // 이미 0 이하인 정점은 탭당 dentPerTapPx까지만 천천히 패인다(과밀기 페널티).
      const reduction =
        cur > 0 ? cur * FLOW.pushFactor * falloff : FLOW.dentPerTapPx * falloff;
      blob.flow[i] = Math.max(-FLOW.maxInPx, cur - reduction);
      touched++;
    }
  }
  if (touched > 0) {
    // 푸시 직후 링 전체 스무딩 2패스 — 눌린 경계 요철을 즉시 다듬는다 (Q가 요철에 민감)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const left = blob.flow[(i - 1 + n) % n]!;
        const right = blob.flow[(i + 1) % n]!;
        blob.flow[i] = blob.flow[i]! * 0.5 + ((left + right) / 2) * 0.5;
      }
    }
    writeVerts(blob, cfg); // 즉각 시각 피드백 (다음 프레임 안 기다림)
  }
  return touched;
}

/** 가장 불룩한 정점 정보 — 밀기 힌트 위치용 (maxFlow가 임계 미만이면 null) */
export function bulgePoint(
  blob: BlobState,
  minFlowPx: number,
  cfg: BlobConfig = EGG,
): { x: number; y: number; angle: number; flow: number } | null {
  const n = cfg.VERTEX_COUNT;
  let best = -1;
  let bestFlow = minFlowPx;
  for (let i = 0; i < n; i++) {
    if (blob.flow[i]! > bestFlow) {
      bestFlow = blob.flow[i]!;
      best = i;
    }
  }
  if (best < 0) return null;
  return {
    x: blob.verts[best * 2]!,
    y: blob.verts[best * 2 + 1]!,
    angle: (best / n) * Math.PI * 2,
    flow: bestFlow,
  };
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
