// 계란 스킨 정의 (GDD §12 BM — 코스메틱 스킨). ADR-0011 코인으로 구매.
// 표현 오버라이드만 담는다(채점·판정 무영향). 색 미지정 필드는 palette.ts 기본값 사용.
// 새 스킨 = 이 배열 1항목 (stages.ts 선례 — 콘텐츠 정의는 data/에 인라인 허용).

/** 기본 스킨 id — 저장 초기값·마이그레이션 기본값 (systems/save.ts에서 참조) */
export const DEFAULT_SKIN_ID = 'classic';

export interface SkinDef {
  readonly id: string;
  /** 상점 표기명 — ASCII만 (한글 폰트 미탑재) */
  readonly name: string;
  /** 가격 (코인, ADR-0011) — 0이면 기본 보유 */
  readonly price: number;
  /** 노른자 채움색 오버라이드 (기본: palette YOLK_STYLE.fill) */
  readonly yolkFill?: number;
  /** 노른자 테두리색 오버라이드 (기본: palette YOLK_STYLE.edge) */
  readonly yolkEdge?: number;
  /** 흰자 틴트 오버라이드 (기본: 익힘 상태별 COOK_STATE_STYLE) */
  readonly whiteTint?: number;
}

/** 스킨 카탈로그 — 따뜻한 Bacon 파스텔 톤 유지 */
export const SKINS: readonly SkinDef[] = [
  {
    // 기본 계란 — 오버라이드 없음
    id: 'classic',
    name: 'CLASSIC',
    price: 0,
  },
  {
    // 금빛 노른자 — 코인 색조와 어울리는 진한 금색
    id: 'golden',
    name: 'GOLDEN',
    price: 60,
    yolkFill: 0xf0c030,
    yolkEdge: 0xb8862a,
  },
  {
    // 민트빛 흰자 — 파스텔 민트
    id: 'mint',
    name: 'MINT',
    price: 40,
    whiteTint: 0xe0f5ec,
  },
  {
    // 초코 노른자 — 브라운 톤
    id: 'choco',
    name: 'CHOCO',
    price: 80,
    yolkFill: 0x8a5a2b,
    yolkEdge: 0x5c3a1a,
  },
];

export function findSkin(id: string): SkinDef | undefined {
  return SKINS.find((s) => s.id === id);
}
