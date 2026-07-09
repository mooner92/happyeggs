// 스테이지 데이터 (GDD §10) — JSON 형태 정의. M3 로더가 검증 후 StageSession으로 변환.
// orderMax ≤ panCapacity 보장. 새 스테이지 = 이 배열 1항목.
import type { StageDef } from '../systems/stageDef';

export const STAGES: readonly StageDef[] = [
  {
    id: 'stage_01',
    background: 'kitchen_day',
    heatSource: 'gas',
    customers: 5,
    orderRange: [1, 2],
    panCapacity: 2,
    eggStock: 12,
    enemyPool: ['ninja_spider', 'back_robber'],
    eventBudget: 3,
    starThresholds: [80.0, 90.0, 96.0],
    items: [
      { id: 'lid', pos: 'wall_left' },
      { id: 'torch', pos: 'stove_side' },
      { id: 'fencing_sword', pos: 'wall_right_a' },
      { id: 'shield_decoy', pos: 'wall_right_b' },
    ],
  },
  {
    id: 'stage_02',
    background: 'kitchen_day',
    heatSource: 'brazier', // 화롯불 1.3 — 더 빠름
    customers: 6,
    orderRange: [1, 2],
    panCapacity: 2,
    eggStock: 14,
    enemyPool: ['ninja_spider', 'back_robber', 'sneeze_troll', 'hair_troll', 'fly', 'sniper'],
    eventBudget: 4,
    starThresholds: [82.0, 91.0, 97.0],
    items: [
      { id: 'lid', pos: 'wall_left' },
      { id: 'torch', pos: 'stove_side' },
      { id: 'fencing_sword', pos: 'wall_right_a' },
      { id: 'shield_decoy', pos: 'wall_right_b' },
    ],
  },
  {
    id: 'stage_03',
    background: 'kitchen_night',
    heatSource: 'brazier', // 주황 숯 ↔ 가짜불(차가운 파랑) 대비 — 열화상 트릭의 가독성 (GDD §8.1 ⑦)
    customers: 6,
    orderRange: [1, 2],
    panCapacity: 2,
    eggStock: 14,
    enemyPool: ['ninja_spider', 'sneeze_troll', 'hair_troll', 'fly', 'sniper', 'fire_snuffer'],
    eventBudget: 5,
    starThresholds: [82.0, 91.0, 97.0],
    items: [
      { id: 'lid', pos: 'wall_left' },
      { id: 'torch', pos: 'stove_side' },
      { id: 'fencing_sword', pos: 'wall_right_a' },
      { id: 'shield_decoy', pos: 'wall_right_b' },
    ],
    night: true, // 야간 — 열화상 표현 + 불 끄기 적 (GDD §8.1 ⑦, M5)
  },
];

export function findStage(id: string): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}
