// 이벤트 스케줄러 (GDD §8) — 조리 중에만 랜덤 스폰, budget/cooldown/maxConcurrent 준수. 순수·결정론.
import type { EnemyDef, InputKey } from './enemyDef';
import { EventInstance } from './eventInstance';

/** [min, max] 정수 난수 시드 인터페이스 */
export type RangeRng = (min: number, max: number) => number;

export interface ScheduleResult {
  readonly spawned: readonly EventInstance[];
  readonly resolved: readonly EventInstance[];
}

export class EventScheduler {
  private readonly instances: EventInstance[] = [];
  private budget: number;
  private nextSpawnMs: number;
  /** 적별 쿨다운 남은 시간(ms) */
  private readonly cooldown = new Map<string, number>();

  constructor(
    private readonly pool: readonly EnemyDef[],
    eventBudget: number,
    private readonly globalMaxConcurrent: number,
    private readonly rng: RangeRng,
    private readonly stage: number,
    /** 스폰 간격 범위(ms) */
    private readonly spawnGapMs: readonly [number, number] = [2500, 6000],
  ) {
    this.budget = Math.max(0, Math.floor(eventBudget));
    this.nextSpawnMs = rng(spawnGapMs[0], spawnGapMs[1]);
  }

  get active(): readonly EventInstance[] {
    return this.instances;
  }

  get budgetLeft(): number {
    return this.budget;
  }

  /** 이번 스테이지에 등장 가능한 적 */
  private eligible(): EnemyDef[] {
    return this.pool.filter((d) => d.stageUnlock <= this.stage);
  }

  private activeCountOf(id: string): number {
    return this.instances.filter((i) => i.def.id === id && !i.isResolved).length;
  }

  private spawnable(): EnemyDef[] {
    const liveTotal = this.instances.filter((i) => !i.isResolved).length;
    if (liveTotal >= this.globalMaxConcurrent) return [];
    return this.eligible().filter(
      (d) => (this.cooldown.get(d.id) ?? 0) <= 0 && this.activeCountOf(d.id) < d.maxConcurrent,
    );
  }

  /** 한 틱 — 조리 중일 때만 스폰 타이머가 흐른다. 스폰·해소된 이벤트를 반환 */
  update(dtMs: number, cookingActive: boolean): ScheduleResult {
    const spawned: EventInstance[] = [];
    const resolved: EventInstance[] = [];

    // 쿨다운 감소 (항상)
    for (const [id, ms] of this.cooldown) {
      this.cooldown.set(id, Math.max(0, ms - dtMs));
    }

    // 활성 인스턴스 진행 + 해소 수거
    for (const inst of this.instances) {
      const wasResolved = inst.isResolved;
      inst.update(dtMs);
      if (!wasResolved && inst.isResolved) {
        resolved.push(inst);
        this.cooldown.set(inst.def.id, this.rng(inst.def.cooldownMs[0], inst.def.cooldownMs[1]));
      }
    }
    // 해소된 것 제거
    for (let i = this.instances.length - 1; i >= 0; i--) {
      if (this.instances[i]!.isResolved) this.instances.splice(i, 1);
    }

    // 스폰 — 조리 중 + budget 남음
    if (cookingActive && this.budget > 0) {
      this.nextSpawnMs -= dtMs;
      if (this.nextSpawnMs <= 0) {
        const candidates = this.spawnable();
        if (candidates.length > 0) {
          const pick = candidates[this.rng(0, candidates.length - 1)]!;
          const inst = new EventInstance(pick);
          this.instances.push(inst);
          spawned.push(inst);
          this.budget--;
        }
        this.nextSpawnMs = this.rng(this.spawnGapMs[0], this.spawnGapMs[1]);
      }
    }

    return { spawned, resolved };
  }

  /** 대응 입력을 window 중인 활성 이벤트에 전달 — 첫 성공 시 그 인스턴스 반환 */
  tryInput(key: InputKey): EventInstance | null {
    for (const inst of this.instances) {
      if (inst.tryInput(key)) return inst;
    }
    return null;
  }
}
