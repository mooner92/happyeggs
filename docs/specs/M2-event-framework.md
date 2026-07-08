# M2 스펙 — 이벤트 프레임워크 (Event Framework)

> [GDD](../../GDD.md) §8·§13 **M2 — 이벤트 프레임워크**. "새 적 추가 = JSON 항목 + 핸들러 1개"가 되는 데이터 주도 방해꾼 시스템을 세우고, **닌자 거미·뒷문 강도** 2종으로 증명한다.

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Verified** (2026-07-08 — 테스트 109 + Playwright 이벤트 검증) |
| 작성일 | 2026-07-08 |
| 근거 GDD 절 | [GDD](../../GDD.md) §8 방해꾼 이벤트 · §8.1 ①②(거미·강도) · §13 M2 |
| 선행 | M1 **Verified** ([M1-core-loop.md](M1-core-loop.md)) |
| 구현 브랜치 | `feat/m1-core-loop`(연속 스택; M2 커밋 이어붙임) |

## 1. 배경

M1에서 한 판(깨기→익힘→뒤집기→채점→서빙)이 완성됐다. M2는 그 위에 **멀티태스킹 압박**을 얹는다: 조리 중 방해꾼이 랜덤 등장해 짧은 시간 안에 올바른 입력으로 처리해야 한다. 핵심은 **데이터 주도** — 적의 스펙은 JSON(데이터)이고, 새 적은 데이터 1줄 + 입력 핸들러 1개로 추가된다.

## 2. 범위 (M2에서 만드는 것)

- **공통 스키마**(GDD §8): `id / stageUnlock / telegraphMs / responseWindowMs / input / cooldownMs / maxConcurrent / onSuccess / onFail`
- **공통 파이프라인**: `telegraph`(전조) → `window`(대응 입력 허용) → `resolve`(성공/실패)
- **스케줄러**(순수): 조리 중에만 발생, 스테이지별 `eventBudget` 소진까지 랜덤 간격, 적별 `cooldownMs`·`maxConcurrent`·전역 동시 제한 준수. 전부 시드 RNG로 결정론.
- **닌자 거미**(GDD §8.1 ①): 천장에서 하강 → **드래그로 거미줄 절단** 성공(거미 낙하 + 밟는 SFX 스텁 + 거미줄 트로피 라운드 끝까지 휘날림) / 실패(후라이 **반토막**)
- **뒷문 강도**(GDD §8.1 ②): 뒷문 진입 → **빠른 더블탭**(고양이 소환) 성공 / 실패(노른자 **도난·파손**)
- **오브젝트 풀링**: 적 뷰·파티클 재사용(성능 예산 GDD §2)
- 절차적 Bacon 톤 적 비주얼 ([ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md))

## 3. 비범위

| 미루는 곳 | 항목 |
|---|---|
| **M3+** | JSON 스테이지 로더(M2는 하드코딩 풀), 실패 연출 완성·결과 |
| **M4** | 저격수·파리·재채기·머리카락, 아이템 미스리드, 도난→방어 불가 연쇄, 지역 확장 적(더미 스키마만 M2에서 검증) |
| **표현** | SFX는 무음 스텁 훅(GDD §14) |

## 4. 설계 — 순수 모델 / 뷰 분리

### 4.1 순수 (systems/ — Vitest 대상)

| 모듈 | 역할 / API |
|---|---|
| `enemyDef.ts` | `EnemyDef`(GDD §8 스키마 타입) + `InputKey`(`drag_cut`\|`double_tap`\|…) |
| `eventInstance.ts` | `EventInstance` — 한 이벤트의 상태기계. `update(dtMs)`(telegraph→window→resolve, window 만료 시 자동 실패), `tryInput(key)`(window 중 일치 시 성공), getter `phase`·`result`·`phaseProgress01` |
| `eventScheduler.ts` | `EventScheduler(pool, eventBudget, globalMaxConcurrent, rng, stage)` — `update(dtMs, cookingActive)`→`{spawned, resolved}`, `tryInput(key)`, getter `active`·`budgetLeft`. 조리 중에만 스폰, cooldown·maxConcurrent·budget·stageUnlock 준수 |

### 4.2 데이터

`data/enemies.ts` — `ENEMIES: EnemyDef[]`(ninja_spider·back_robber) + 지역 확장 더미(penguin, 핸들러 없음 — 스키마 수용 증명, GDD §8.1 ⑧).

### 4.3 뷰 (ui/ — 절차적, 풀링)

`SpiderView`·`RobberView`(적별 절차적 비주얼) + `ViewPool<T>`(재사용) + 이펙트(거미줄 트로피·반토막·고양이·노른자 파손). 이펙트 키(`onSuccess`/`onFail` 문자열)는 씬의 **이펙트 레지스트리**가 함수로 매핑 = "핸들러 1개".

## 5. 파이프라인 (GDD §8)

```
스폰(조리 중, budget>0, cooldown/concurrent 통과)
  → telegraph(telegraphMs, 전조 연출·입력 불가)
  → window(responseWindowMs, 올바른 input 대기)
      · 일치 입력 → resolve success → onSuccess 이펙트
      · 만료 → resolve fail → onFail 이펙트
```

## 6. 구현 순서 (커밋)

| # | 커밋 |
|---|---|
| 1 | `feat: add enemy schema + event instance state machine` (+test) |
| 2 | `feat: add event scheduler (budget/cooldown/concurrent, cooking-gated)` (+test) |
| 3 | `feat: add enemy defs data (spider, robber, dummy)` |
| 4 | `feat: spider enemy — descend, drag-cut success (web trophy) / timeout bisect` (Playwright) |
| 5 | `feat: robber enemy — double-tap cat success / yolk-steal fail` (Playwright) |
| 6 | `feat: wire scheduler into game scene + view pooling + input routing` (Playwright) |

## 7. 테스트 계획 (Vitest — 순수)

- **EventInstance**: telegraph→window→resolve 경계 시각 · window 중 일치 입력=성공 · 불일치/telegraph 중 입력 무시 · window 만료=실패 · 이미 resolve된 뒤 입력 무시 · phaseProgress01
- **EventScheduler**: 조리 중에만 스폰(cookingActive=false면 정지) · eventBudget 소진 후 정지 · cooldownMs 준수 · maxConcurrent(적별·전역) · stageUnlock 필터 · 시드 RNG 결정론 · resolve된 인스턴스 제거

## 8. 인수 조건 (GDD §13 M2)

- [x] 조리 중 거미·강도 이벤트가 스케줄러로 발생(스폰/telegraph/window/resolve) — 순수 테스트 + Playwright
- [x] 거미: 드래그 절단 성공(거미줄 트로피) / 방치 실패(후라이 반토막) 각각 재현 (Playwright)
- [x] 강도: 더블탭 성공(고양이 질주) / 방치 실패(노른자 파손) 각각 재현 (Playwright)
- [x] `npm run test` 그린(109) + Playwright 시각 QA + 콘솔 에러 0
- [x] "새 적 = JSON + 핸들러 1개" 구조 — 더미 penguin(stageUnlock 99)이 풀에 로드되나 미등장(필터 테스트)

## 9. as-built (완료)

**순수 프레임워크:** `enemyDef`(GDD §8 스키마)·`eventInstance`(telegraph→window→resolve, 만료 자동 실패)·`eventScheduler`(조리 중 스폰·budget·cooldown·maxConcurrent·stageUnlock·시드 결정론). **Vitest 16개 추가**(총 109 그린).

**데이터 주도:** `data/enemies.ts`에 거미·강도·더미 정의. 씬은 `enemyViewFor`(적별 뷰) + `runEffect`(onSuccess/onFail 문자열 키 → 함수)로 매핑 = "새 적 = JSON 1항목 + 핸들러 1개".

**뷰·이펙트:** 거미(하강·칼·전조 바)·강도(후드·자루·진입) 절차적 뷰, 거미줄 트로피(라운드 끝까지 휘날림)·고양이 질주·반토막(polygon 접기+frozen)·노른자 파손. 입력 라우팅: 드래그=거미줄 절단, 더블탭=고양이(윈도우 중 단일 탭은 더블탭용 예약).

**Playwright 검증 (`qa/verify-m2-events.mjs`, 콘솔 에러 0):** 거미 window→드래그 절단→트로피, 거미 방치→반토막(반달), 강도 window→더블탭→고양이, 강도 방치→노른자 파손. `?spawn=`·`?spawnAfter=` 디버그 스폰 훅.

**as-built 차이:**
- M2 데모용으로 거미·강도 `stageUnlock=1`(GDD 예시는 거미 2) — 실제 해금 값은 M3 스테이지 데이터에서.
- 발사체/이탈처럼 이벤트 실패의 게임 영향은 M2 수준(반토막·노른자 파손)까지 — 아이템 도난→방어 불가 연쇄는 M4.
- 오브젝트 풀링은 maxConcurrent 1이라 create/destroy로 충분 — 대량 동시 등장 시 풀은 M6 성능 패스에서.

---

## 관련 문서

- SDD 프로세스: [README.md](README.md) · 선행: [M1-core-loop.md](M1-core-loop.md)
- SSOT: [../../GDD.md](../../GDD.md) §8 · 게임 시스템: [../03-game-systems.md](../03-game-systems.md) · 아트: [../adr/0009-procedural-bacon-art-and-continuous-dev.md](../adr/0009-procedural-bacon-art-and-continuous-dev.md)

최종 수정: 2026-07-08
