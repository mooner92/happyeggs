// 주방 아이템 (GDD §9) — 스테이지 데이터로 위치 배치. 일부 적의 대응 입력이 된다.
// decoy(오답)는 correctFor=null + failGag(개그 연출). 의도적 미스리드가 핵심 재미.

export interface ItemDef {
  readonly id: string;
  /** 이 아이템이 정답인 적 id (decoy면 null) */
  readonly correctFor: string | null;
  /** 오답 탭 시 개그 (decoy) */
  readonly failGag: string | null;
}

export const ITEMS: Readonly<Record<string, ItemDef>> = {
  lid: { id: 'lid', correctFor: 'sneeze_troll', failGag: null },
  torch: { id: 'torch', correctFor: 'hair_troll', failGag: null },
  fencing_sword: { id: 'fencing_sword', correctFor: 'sniper', failGag: null },
  shield_decoy: { id: 'shield_decoy', correctFor: null, failGag: 'handle_falls_off' },
};

/** 배치 위치(pos 문자열) → 화면 비율 좌표 (GDD §9: 벽걸이·스토브 옆·선반 등)
 *  미스리드 핵심: 칼(wall_right_a)과 방패(wall_right_b)는 **나란히** 걸린다. */
export const ITEM_POS: Readonly<Record<string, { x: number; y: number }>> = {
  wall_left: { x: 0.1, y: 0.41 },
  wall_right_a: { x: 0.8, y: 0.41 },
  wall_right_b: { x: 0.92, y: 0.44 },
  stove_side: { x: 0.9, y: 0.55 },
  shelf: { x: 0.1, y: 0.55 },
};
