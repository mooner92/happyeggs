import { EventBus } from './EventBus';

/**
 * 게임 이벤트 사전 — 이름·페이로드 타입은 여기서만 정의한다.
 * 네이밍 규약: `domain:action`.
 *
 * 향후 도메인 예약(주석만 — 타입·코드 선작성 금지, YAGNI):
 *   flip:*  (M1 뒤집기) · serve:* (M1 서빙) · enemy:* (M2+ 방해꾼) · stage:* (M3+ 스테이지)
 */
export interface GameEvents {
  /** 계란 깨짐 — pointerdown으로 팬 위에 블롭 생성 */
  'egg:cracked': { eggId: number; x: number; y: number };
}

/** 전역 버스 — 씬 리스너는 shutdown에서 해제할 것 */
export const bus = new EventBus<GameEvents>();
