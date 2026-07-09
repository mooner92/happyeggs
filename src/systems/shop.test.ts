import { describe, expect, it } from 'vitest';
import { DEFAULT_SKIN_ID, findSkin, type SkinDef } from '../data/skins';
import { addCoins, loadSave, type KVStorage } from './save';
import { buySkin, canBuy } from './shop';

function fakeStorage(initial: Record<string, string> = {}): KVStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

const MINT = findSkin('mint') as SkinDef; // price 40
const GOLDEN = findSkin('golden') as SkinDef; // price 60

describe('shop', () => {
  it('canBuy — 코인이 가격 이상이고 미보유일 때만 true (경계 포함)', () => {
    const st = fakeStorage();
    expect(canBuy(loadSave(st), MINT)).toBe(false); // 0 < 40
    addCoins(st, MINT.price - 1);
    expect(canBuy(loadSave(st), MINT)).toBe(false); // 39 < 40
    addCoins(st, 1);
    expect(canBuy(loadSave(st), MINT)).toBe(true); // 40 == 40 (경계)
  });

  it('canBuy — 이미 보유한 스킨은 코인이 충분해도 false', () => {
    const st = fakeStorage();
    addCoins(st, 999);
    const classic = findSkin(DEFAULT_SKIN_ID) as SkinDef; // 기본 보유 + price 0
    expect(canBuy(loadSave(st), classic)).toBe(false);
  });

  it('buySkin 성공 — 코인 차감 + 보유 추가 + 즉시 장착', () => {
    const st = fakeStorage();
    addCoins(st, 100);
    const s = buySkin(st, GOLDEN);
    expect(s).not.toBeNull();
    expect(s?.coins).toBe(100 - GOLDEN.price);
    expect(s?.ownedSkins).toContain(GOLDEN.id);
    expect(s?.equippedSkin).toBe(GOLDEN.id);
    // 저장소에도 반영
    expect(loadSave(st)).toEqual(s);
  });

  it('buySkin — 잔액 부족이면 null, 저장 무변경', () => {
    const st = fakeStorage();
    addCoins(st, GOLDEN.price - 1);
    expect(buySkin(st, GOLDEN)).toBeNull();
    const s = loadSave(st);
    expect(s.coins).toBe(GOLDEN.price - 1);
    expect(s.ownedSkins).toEqual([DEFAULT_SKIN_ID]);
  });

  it('buySkin — 중복 구매는 null (코인 이중 차감 방지)', () => {
    const st = fakeStorage();
    addCoins(st, 200);
    expect(buySkin(st, MINT)).not.toBeNull();
    expect(buySkin(st, MINT)).toBeNull();
    const s = loadSave(st);
    expect(s.coins).toBe(200 - MINT.price); // 1회만 차감
    expect(s.ownedSkins.filter((id) => id === MINT.id)).toHaveLength(1);
  });
});
