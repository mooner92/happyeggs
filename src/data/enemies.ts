// 방해꾼 적 정의 (GDD §8·§8.1) — 데이터 주도. 새 적 = 이 배열 1항목 + 씬의 입력/이펙트 핸들러.
import type { EnemyDef } from '../systems/enemyDef';

export const ENEMIES: readonly EnemyDef[] = [
  // ① 닌자 거미 — 천장에서 하강, 드래그로 거미줄 절단 (GDD §8.1 ①)
  {
    id: 'ninja_spider',
    stageUnlock: 1,
    telegraphMs: 900,
    responseWindowMs: 2000,
    input: 'drag_cut',
    cooldownMs: [7000, 12000],
    maxConcurrent: 1,
    onSuccess: ['fx_web_flutter', 'sfx_stomp_offscreen'],
    onFail: ['egg_bisect', 'actor_escape'],
  },
  // ② 뒷문 강도 — 뒷문 진입, 빠른 더블탭으로 고양이 소환 (GDD §8.1 ②)
  {
    id: 'back_robber',
    stageUnlock: 1,
    telegraphMs: 800,
    responseWindowMs: 1900,
    input: 'double_tap',
    cooldownMs: [8000, 14000],
    maxConcurrent: 1,
    onSuccess: ['fx_cat_chase', 'sfx_meow'],
    onFail: ['yolk_steal', 'actor_escape'],
  },
  // ③ 재채기 손님 (GDD §8.1 ③) — 팬 뚜껑 탭으로 침 차단. 실패 = 즉시 게임 오버 (DECISION-01)
  {
    id: 'sneeze_troll',
    stageUnlock: 1,
    telegraphMs: 1100,
    responseWindowMs: 1600,
    input: 'lid',
    cooldownMs: [9000, 15000],
    maxConcurrent: 1,
    onSuccess: ['fx_lid_block', 'sfx_lid'],
    onFail: ['game_over_sneeze', 'actor_escape'],
  },
  // ④ 머리카락 손님 (GDD §8.1 ④) — 토치로 공중 소각. 실패 = 해당 계란 -10 (DECISION-02)
  {
    id: 'hair_troll',
    stageUnlock: 1,
    telegraphMs: 1000,
    responseWindowMs: 1700,
    input: 'torch',
    cooldownMs: [8000, 14000],
    maxConcurrent: 1,
    onSuccess: ['fx_torch_burn', 'sfx_sizzle'],
    onFail: ['hair_land', 'actor_escape'],
  },
  // ⑥ 파리 (GDD §8.1 ⑥) — 착지 후 똥 전조 때 탭하면 별 처치. 방치 = -20
  {
    id: 'fly',
    stageUnlock: 1,
    telegraphMs: 1400, // 비행+티배깅(무적)
    responseWindowMs: 1000, // 착지 후 똥 전조(탭 허용)
    input: 'tap',
    cooldownMs: [7000, 12000],
    maxConcurrent: 1,
    onSuccess: ['fx_star_kill', 'sfx_pop'],
    onFail: ['fly_poop', 'actor_escape'],
  },
  // ⑤ 저격수 (GDD §8.1 ⑤) — 레이저 조준 → 펜싱칼 탭(패링) 반사. 레이저 직접 탭 = +1 증원(최대 3, DECISION-04). 방치 = 후라이 구멍
  {
    id: 'sniper',
    stageUnlock: 2,
    telegraphMs: 1300, // 조준 스윕
    responseWindowMs: 1500, // 락온(패링 허용)
    input: 'fencing_sword',
    cooldownMs: [10000, 16000],
    maxConcurrent: 1,
    onSuccess: ['fx_parry_reflect', 'sfx_clang'],
    onFail: ['bullet_hole', 'actor_escape'],
  },
  // ⑦ 불 끄기 적 (GDD §8.1 ⑦, M5 야간) — 스토브로 침입해 불을 끈다. window 중 탭으로 저지.
  // 실패 = 불 꺼짐(조리 정지) + 가짜불 스티커(열화상에서 차갑게 보임) → 스토브 탭으로 재점화
  {
    id: 'fire_snuffer',
    stageUnlock: 3,
    telegraphMs: 1300, // 좌측에서 스토브로 잠입
    responseWindowMs: 1500, // 소화기 들어올림 (탭 저지 허용)
    input: 'tap',
    cooldownMs: [11000, 17000],
    maxConcurrent: 1,
    onSuccess: ['fx_snuffer_flee', 'sfx_yelp'],
    onFail: ['fire_out', 'actor_escape'],
  },
  // ⑧ 지역 확장 더미 (GDD §8.1 ⑧) — 핸들러 없이 스키마 수용만 증명. stageUnlock 99라 미등장.
  {
    id: 'penguin_dummy',
    stageUnlock: 99,
    telegraphMs: 700,
    responseWindowMs: 1500,
    input: 'tap',
    cooldownMs: [10000, 20000],
    maxConcurrent: 1,
    onSuccess: ['fx_placeholder'],
    onFail: ['fx_placeholder'],
  },
];
