// 스킨 상점 (GDD §12 BM — 코스메틱 스킨, ADR-0011 코인으로 구매). 순수 로직.
// 구매 = 코인 차감 + 보유 추가 + 즉시 장착. 잔액·중복 검증은 canBuy 한 곳에서.
import type { SkinDef } from '../data/skins';
import { addCoins, equipSkin, loadSave, unlockSkin, type KVStorage, type SaveData } from './save';

/** 구매 가능 여부 — 미보유이고 코인이 가격 이상일 때만 */
export function canBuy(save: SaveData, skin: SkinDef): boolean {
  return !save.ownedSkins.includes(skin.id) && save.coins >= skin.price;
}

/** 스킨 구매 — 불가하면 null. 성공 시 차감+보유+즉시 장착된 최종 SaveData 반환 */
export function buySkin(storage: KVStorage, skin: SkinDef): SaveData | null {
  if (!canBuy(loadSave(storage), skin)) return null;
  addCoins(storage, -skin.price);
  unlockSkin(storage, skin.id);
  return equipSkin(storage, skin.id);
}
