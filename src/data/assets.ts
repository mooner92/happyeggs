// 에셋 키 매니페스트 (GDD §14) — 최종 아트 교체 시 키만 스프라이트로 스왑한다.
// M0는 전부 Graphics 도형(placeholder)이라 빈 목록 — PreloadScene의 순회 로더가 파이프만 증명한다.

export type AssetType = 'image' | 'atlas' | 'audio';

export interface AssetEntry {
  readonly key: string;
  readonly type: AssetType;
  readonly url: string;
}

export const ASSET_MANIFEST: readonly AssetEntry[] = [];
