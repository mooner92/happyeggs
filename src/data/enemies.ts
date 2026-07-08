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
