# M3 스펙 — 스테이지 시스템 (Stage System)

> [GDD](../../GDD.md) §10·§11·§13 **M3 — 스테이지 시스템**. 하드코딩 STAGE1을 **JSON 스테이지 데이터**로 바꾸고, 실패 조건 3종·결과 화면(후라이 배열·카운트업·별점)·PNG 공유·진행도 저장까지 스테이지 단위 플레이를 닫는다.

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Verified** (2026-07-08 — 테스트 127 + Playwright 클리어/실패 검증) |
| 작성일 | 2026-07-08 |
| 근거 GDD 절 | [GDD](../../GDD.md) §5 실패 조건 · §10 스테이지 데이터 · §11 결과·공유 · §13 M3 |
| 선행 | M2 **Verified** ([M2-event-framework.md](M2-event-framework.md)) |
| 구현 브랜치 | `feat/m1-core-loop`(연속 스택) |

## 1. 배경

M1에서 하드코딩 스테이지 1개, M2에서 방해꾼을 얹었다. M3는 스테이지를 **데이터(JSON)** 로 정의해 로드하고, 열원·팬 용량·적 풀·이벤트 예산·별점 임계를 스테이지별로 다르게 준다. 그리고 스테이지의 끝 — 실패 3종과 결과 화면(별점·공유) — 을 완성한다.

## 2. 범위 (M3에서 만드는 것)

- **JSON 스테이지 스키마**(GDD §10): `id·background·heatSource·customers·orderRange·panCapacity·eggStock·enemyPool·eventBudget·items·starThresholds`
- **스테이지 로더**: 스키마 검증 + `StageSession` 생성(주문 시드 생성, eggStock), 열원 계수·적 풀·이벤트 예산·팬 용량 적용
- **실패 조건 3종**(GDD §5): 스프링클러(SMOKE 방치 → 연출 → 실패) · 재고 부족(재고 < 남은 주문) · 즉사형(프레임만 — 재채기 자체는 M4)
- **결과 화면**(GDD §11): 후라이 접시 배열 + 점수 **카운트업** + 평균/최고 + **별점(★1~3)**
- **PNG 공유**(GDD §11): 결과 화면 → PNG → Web Share API(미지원 시 다운로드 + 클립보드), 파일명 `eggflip_stage01_94.519.png`
- **진행도 저장**: localStorage 래퍼(**schema version 필드**) — 스테이지별 최고 평균·별점·클리어

## 3. 비범위

| 미루는 곳 | 항목 |
|---|---|
| **M4** | 재채기(즉사)·머리카락·저격수·파리, 아이템 미스리드 |
| **M5** | 열화상 야간·스킨 상점 |
| **M6** | 결과 연출 폴리시·SFX |

## 4. 설계 — 순수 / 뷰 분리

### 4.1 순수 (systems/ — Vitest)

| 모듈 | 역할 / API |
|---|---|
| `stageDef.ts` | `StageDef`(GDD §10 스키마) + `validateStage(def)`(범위·필드 검증) |
| `stars.ts` | `starsFor(average, thresholds): 0\|1\|2\|3` |
| `save.ts` | `Storage` 어댑터 인터페이스 + `SaveData`(schemaVersion 포함) + `loadSave`/`recordResult`(스테이지별 최고 평균·별점 병합) — localStorage는 얇은 어댑터, 로직은 순수·테스트 가능 |
| `stage.ts`(확장) | `StageSession.fromDef(def, visibleCount, rng)` + getter `heatSource`·`enemyPool`·`eventBudget`·`panCapacity`·`starThresholds` |

### 4.2 데이터

`data/stages.ts` — `STAGES: StageDef[]`(stage_01 가스·2인 팬, stage_02 화롯불·적 추가). `orderMax ≤ panCapacity` 보장.

### 4.3 뷰 (ui/)

`ResultScene` 강화: 접시 + 후라이 배열 + 점수 카운트업 + 별점 + 공유 버튼. `SprinklerView`(스프링클러 물+플래시). PNG 합성은 `game.renderer.snapshot` → dataURL → share/download.

## 5. 구현 순서 (커밋)

| # | 커밋 |
|---|---|
| 1 | `feat: add stage schema + loader + star rating` (+test) |
| 2 | `feat: add save wrapper (localStorage, schema version)` (+test) |
| 3 | `feat: stage data + wire loader into game scene (heat/pool/capacity)` (Playwright) |
| 4 | `feat: result screen — plate, count-up, stars` (Playwright) |
| 5 | `feat: png export + web share / download fallback` (Playwright) |
| 6 | `feat: sprinkler fail effect + fail result` (Playwright) |

## 6. 테스트 계획 (Vitest — 순수)

- **stageDef/validate**: 정상 통과 · orderRange/panCapacity/eggStock 음수·역전 거부 · orderMax ≤ panCapacity
- **stars**: 임계 경계값(미만/정확/초과) · 0~3 단조 · 임계 3개
- **save**: 빈 저장소 기본값(schemaVersion) · 최고 평균/별점만 갱신(하락 무시) · 다른 스테이지 독립 · 스키마 불일치 시 리셋
- **StageSession.fromDef**: eggStock = def.eggStock · 주문 def.customers개·orderRange 내 · getter 반영

## 7. 인수 조건 (GDD §13 M3)

- [x] JSON 스테이지(stage_01)로 시작→플레이→클리어→결과까지 이어짐 (Playwright)
- [x] 결과 화면에 후라이 접시 배열·점수 카운트업·별점(★★★) 표시
- [x] PNG 생성 + 다운로드(공유 미지원 폴백) 동작 — `eggflip_stage_01_99.534.png` 캡처
- [x] 스프링클러(SMOKE 방치→물 연출→실패) 재현 + 재고 부족 데드락(단위 테스트)
- [x] `npm run test` 그린(127) + Playwright 시각 QA + 콘솔 에러 0

## 8. as-built (완료)

**순수 로직:** `stageDef`(GDD §10 스키마)+`validateStage`, `stars.starsFor`, `save`(KVStorage 어댑터+schemaVersion, 최고 기록 병합), `StageSession.fromDef`+스테이지 getter. **Vitest 20개 추가**(총 127 그린).

**스테이지 로더:** `data/stages.ts`(stage_01 가스·stage_02 화롯불) → `?stage=id`로 로드, 열원 계수(heatSource)·적 풀(enemyPool)·이벤트 예산·팬 용량(panCapacity)을 스테이지별 적용. 클리어/실패 시 별점 계산 + localStorage 최고 평균·별점·클리어 저장.

**결과 화면:** 접시 + 후라이 배열(점수 낮을수록 덜 둥글게) + 별점 팝인 + 점수 카운트업 + best/served/failed + SHARE/RETRY. PNG는 `renderer.snapshot`→dataURL→Web Share(미지원 시 다운로드, 파일명 `eggflip_<stage>_<avg>.png`).

**실패:** SMOKE 방치 → `SprinklerView`(물줄기+플래시) 1.2s → STAGE FAILED(smoke) 결과(빈 접시·빈 별). 재고 부족 데드락은 StageSession 판정.

**Playwright 검증 (콘솔 에러 0):** `qa/verify-m3-stage.mjs`(클리어→접시·★★★·카운트업·PNG 다운로드), `qa/verify-m3-fail.mjs`(스모크→스프링클러→실패 결과).

**as-built 차이:**
- 즉사형 3종 중 재채기(즉사)는 M4 — M3는 스프링클러·재고 부족 2종. 프레임(forceFail)은 재채기도 수용.
- `?events=off` 디버그 플래그로 방해꾼을 꺼 결과 화면을 결정론적으로 검증(이벤트는 M2에서 검증).

---

## 관련 문서

- SDD 프로세스: [README.md](README.md) · 선행: [M2-event-framework.md](M2-event-framework.md)
- SSOT: [../../GDD.md](../../GDD.md) §10·§11 · 게임 시스템: [../03-game-systems.md](../03-game-systems.md)

최종 수정: 2026-07-08
