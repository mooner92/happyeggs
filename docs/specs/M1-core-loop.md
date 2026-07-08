# M1 스펙 — 코어 루프 (Core Loop)

> [GDD](../../GDD.md) §13 **M1 — 코어 루프**의 구현 스펙이다. 깨기→익힘→**뒤집기→채점→서빙**의 한 판을 하드코딩 스테이지 1개로 완성한다.
> 원형도 채점이 이 게임 점수의 심장이며 유닛테스트 필수(GDD §6.4).

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Approved** (2026-07-08 — 디렉터 "spec 따라 v1까지 연속 개발" 지시, [ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md)) |
| 작성일 | 2026-07-08 |
| 근거 GDD 절 | [GDD](../../GDD.md) §5 코어 루프 · §6.3 뒤집기 · §6.4 채점 · §6.5 재고 · §7 손님 · §13 M1 |
| 선행 | M0 **Verified** ([M0-skeleton.md](M0-skeleton.md)) |
| 구현 브랜치 | `feat/m1-core-loop` (M0 위에 스택) |
| [DECISION] | DECISION-03(서빙) = 기본안 확정(§10) · 판정 윈도우 위치 = balance.ts(GDD §0) |

## 1. 배경

M0는 계란을 깨고 익히는 것까지 만들었다(블롭·FSM·색 변화, 전부 Verified). M1은 그 위에 **플레이어 상호작용의 핵심 3종**을 얹어 한 판을 닫는다: (1) 홀드-릴리즈 파워 게이지로 **뒤집기**, (2) 완성 후라이의 **원형도 채점**, (3) 손님에게 **서빙**. 손님 큐·주문·재고가 이 루프를 스테이지로 감싼다.

## 2. 범위 (M1에서 만드는 것)

- **왕복 파워 게이지**: 홀드하면 0→1→0 반복, 릴리즈 시점 값 = `p` (낚시 캐스팅식, GDD §6.3)
- **뒤집기 판정 4종**: 발사(RAW) / 반접힘(p 부족) / 이탈(p 과다) / 클린(스윗스팟) — 순수 함수 (GDD §6.3)
- **팬 틸트 + 계란 포물선 + 착지 스쿼시** 애니 (트윈 절차 애니)
- **원형도 채점** Q = 4πA/P² + 유닛테스트(완벽 원·반토막·구멍 1~2개·융합) (GDD §6.4)
- **스와이프 서빙**: 완성 후라이를 손님 방향 스와이프로 서빙 (DECISION-03 기본안)
- **손님 큐**(3~4명 표시, 맨 앞만 활성) + 말풍선 주문(계란 × N) + **재고 HUD** (GDD §7)
- **계란 재고**: 재고 < 남은 주문 총량 → 즉시 실패 판정 (GDD §6.5)
- **하드코딩 스테이지 1개**: 시작→플레이→클리어 가능
- **Bacon 톤 절차적 아트**로 손님·게이지·말풍선 등 신규 비주얼 ([ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md))

## 3. 비범위 (YAGNI 경계 — 미루는 것)

| 미루는 곳 | 항목 |
|---|---|
| **M2+** | 방해꾼 이벤트·스케줄러, 흰자 융합(채점은 반토막/구멍만 M1), 오브젝트 풀링 |
| **M3+** | JSON 스테이지 로더(M1은 하드코딩 1개), 실패 연출·결과 화면·PNG 공유, 별점, localStorage |
| **M4+** | 아이템·미스리드, 도난 연쇄, 발사체가 실제로 손님 피격→아이템 도난(M1은 발사=계란 로스트까지) |
| **표현** | 손님 인내심 타이머 없음(GDD §7 v1) |

## 4. 설계

### 4.1 순수 모델 (systems/ — Vitest 대상, Phaser import 금지)

| 모듈 | 역할 / 공개 API |
|---|---|
| `geometry.ts` | `polygonArea(pts): number`(shoelace, 절대값) · `polygonPerimeter(pts): number` · `Vec2` 타입. 채점·블롭 공용 |
| `scoring.ts` | `circularity(outline, holes[]): number`(Q_eff = 4π·A_eff/P_eff², A_eff=A−ΣA_hole, P_eff=P+ΣP_hole) · `scoreFromQ(q): number`(`floor(q×100×1000)/1000`) · `stageAverage(scores[]): number`. 반토막=남은 폴리곤 그대로 입력 |
| `flip.ts` | `PowerGauge`(왕복 삼각파: `valueAt(heldSec): number` 0→1→0, 주기 `balance.FLIP.periodSec`) · `judgeFlip(cookState, p, sweetspot): FlipOutcome` — 순수. `FlipOutcome = PROJECTILE\|CLEAN\|HALF_FOLD\|FLEW_OFF\|BURNT_FLIP` |
| `inventory.ts` | `Inventory`(stock, `consume(n)`, `get remainingStock`) · `isDeadlocked(stock, remainingOrders): boolean`(재고 < 남은 주문 → 실패, GDD §6.5) |
| `orders.ts` | `Order`(eggCount) · `CustomerQueue`(front 활성, `serveFront()`, `get visible`) — 인내심 타이머 없음 |

### 4.2 뷰 (ui/ — 절차적 Bacon 톤, ADR-0009)

`PowerGaugeView`(왕복 바) · `CustomerView`/`QueueView`(라운드 몸통+간단 표정, 말풍선 주문) · `ScorePopupView`(소수점 3자리) · `InventoryHudView`(재고/점수/손님수). 팬·계란 뷰는 M0 재사용(원근 반영됨).

### 4.3 판정 윈도우 위치

GDD §0은 "판정 윈도우는 balance.ts"라 못박았다. 스윗스팟 `[lo, hi]`와 게이지 주기는 `balance.FLIP`에 둔다. 스테이지별 오버라이드는 M3 스테이지 데이터 소관(M1은 balance 기본값 사용).

## 5. 뒤집기 판정표 (GDD §6.3)

| 익힘 상태 | p 조건 | 결과 (`FlipOutcome`) | 효과 |
|---|---|---|---|
| RAW | — | `PROJECTILE` | 발사체 → (M1) 계란 로스트, 재고 이미 차감 (손님 피격·아이템 도난은 M4) |
| SET / PERFECT_WINDOW | p ∈ [lo, hi] | `CLEAN` | 클린 착지, 변형 최소 — 만점 루트 |
| SET / PERFECT_WINDOW | p < lo | `HALF_FOLD` | 반접힘, 폴리곤 대변형 → 점수 폭락 |
| SET / PERFECT_WINDOW | p > hi | `FLEW_OFF` | 팬 밖 이탈, 계란 로스트(재고 소모됨) |
| OVERDONE / BURNT / SMOKE | — | `BURNT_FLIP` | 까만 뒷면 → 손님 분노, 재고 N개 도난 → 주문 실패 |

## 6. 원형도 채점 (GDD §6.4)

- **Q = 4πA / P²** (완벽한 원 = 1.0). 구멍: `A_eff = A − ΣA_hole`, `P_eff = P + ΣP_hole`. 반토막: 남은 폴리곤 그대로.
- `score = floor(Q_eff × 100 × 1000) / 1000` → **"97.412"** 표기(floor 절사). 노이즈 특성상 100.000 도달 불가(의도).
- 스테이지 점수 = 서빙 성공한 계란 점수 평균. 주문 실패 계란은 미집계.
- 고정 감점(원형도와 별개): 노른자 파손 −15.000 / 머리카락 −10.000 / 파리 똥 −20.000 (M4 이벤트에서 발생, M1은 상수·합산 함수만).

## 7. 구현 순서 (커밋 단위 — 각각 빌드·테스트 그린)

| # | 커밋 |
|---|---|
| 1 | `feat: add polygon geometry (area/perimeter)` (+test) |
| 2 | `feat: add circularity scoring (Q, floor, average)` (+test) — GDD §6.4 필수 케이스 |
| 3 | `feat: add power gauge and flip judgment` (+test) — 판정표 전 분기 |
| 4 | `feat: add egg inventory and deadlock check` (+test) |
| 5 | `feat: add customer queue and orders model` (+test) |
| 6 | `feat: balance additions (FLIP/SCORE/ORDER/STAGE1)` |
| 7 | `feat: power gauge view + hold-release input` (Playwright) |
| 8 | `feat: flip animation — pan tilt, parabola, landing squash` (Playwright) |
| 9 | `feat: circularity scoring wired to blob outline + score popup` (Playwright) |
| 10 | `feat: customer queue + order bubbles (bacon-style)` (Playwright) |
| 11 | `feat: swipe-to-serve + inventory HUD` (Playwright) |
| 12 | `feat: hardcoded stage 1 — clearable end to end` (Playwright) |

## 8. 테스트 계획 (Vitest — 순수 로직만)

- **geometry**: 정n각형 면적/둘레 ↔ 해석값 수렴, 삼각형 shoelace, 정점 순서 무관(절대값)
- **scoring**: 완벽 원(Q→1, 정64각형 근사) · 반토막(Q 폭락) · 구멍 1~2개(A_eff/P_eff 감점) · 융합(면적 합) · `floor` 절사("97.412") · 100.000 미도달 · 평균
- **flip**: 게이지 왕복(0→1→0, 주기·경계) · 판정표 전 분기(RAW→PROJECTILE, 스윗스팟 in/below/above → CLEAN/HALF_FOLD/FLEW_OFF, OVERDONE~SMOKE → BURNT_FLIP) · 파라미터라이즈드
- **inventory**: consume 차감 · 음수/초과 방어 · deadlock 경계(재고 == 남은 주문, < 남은 주문)
- **orders**: 큐 front 활성 · serveFront 진행 · visible 개수 상한

렌더·입력·애니(커밋 7~12)는 Vitest 아님 — **Playwright 시각 QA**([../../qa/README.md](../../qa/README.md))로 검증.

## 9. 인수 조건 (GDD §13 M1)

- [ ] 채점 유닛테스트 전부 통과(완벽 원·반토막·구멍·융합 — GDD §6.4)
- [ ] 뒤집기 판정 4종이 게이지 조작으로 각각 재현(Playwright)
- [ ] 하드코딩 스테이지 1개를 처음부터 끝까지 **클리어 가능**(대기열 소진)
- [ ] 재고 < 남은 주문 시 실패 판정 동작
- [ ] `npm run test` 그린 + Playwright 시각 QA + 콘솔 에러 0

## 10. [DECISION] 확정

- **DECISION-03 서빙 방식** = **손님 방향 스와이프**(GDD §16 기본안 확정). 대안(2차 익힘 완료 시 자동)은 미채택. [../DECISIONS.md](../DECISIONS.md) 갱신.
- **판정 윈도우 위치** = `balance.FLIP`(GDD §0 "판정 윈도우는 balance.ts"). 스테이지 오버라이드는 M3.

## 11. as-built (진행 중)

**완료 (커밋 + 검증):**
- 순수 로직 코어 §7-1~5: `geometry`·`scoring`(GDD §6.4 필수 케이스)·`flip`(게이지+판정표)·`inventory`·`orders` + balance(FLIP/SCORE/ORDER/STAGE1). **Vitest 42개 추가**(총 85 그린).
- 뒤집기 상호작용 §7-7~9,11(부분): 파워 게이지 뷰 + 점수 팝업 + 제스처 상태기계(탭=깨기 / 홀드-릴리즈=뒤집기 / 위로 스와이프=서빙) + 뒤집기 애니(포물선·착지 스쿼시·반접힘 폴리곤 접기·이탈/발사 날아감) + 서빙 시 `circularity(블롭 외곽)→scoreFromQ` 점수 팝업.
- **Playwright 시각 검증**(`qa/verify-m1-flip.mjs`): 게이지 바(스윗스팟/마커) 표시 · 클린 착지 · 오버차지 이탈(FLEW_OFF) · 스와이프 서빙 점수(99.693, 100 미도달) · 콘솔 에러 0.

**as-built 차이:**
- 게이지는 홀드 시간이 탭 임계(`TAP_MAX_MS`=180ms)를 넘을 때만 표시 — 빠른 탭(깨기)과 홀드(뒤집기)를 한 포인터로 구분.
- M1 뒤집기 발사체/이탈은 "계란이 위로 날아가 소실"까지(손님 피격·아이템 도난은 M4). 반접힘은 폴리곤을 가로로 접어 원형도(점수)를 실제로 떨어뜨린다.

**남은 것 (다음 증분):** §7-10 손님 큐(Bacon 톤 캐릭터)+말풍선 · §7-11 재고 HUD + 서빙→손님 진행 · §7-12 하드코딩 스테이지 1 클리어(재고 부족/스모크 실패 포함). `StageSession` 순수 모델로 큐·재고·점수·상태(PLAYING/CLEARED/FAILED)를 묶어 테스트한다.

---

## 관련 문서

- SDD 프로세스: [README.md](README.md) · 선행 스펙: [M0-skeleton.md](M0-skeleton.md)
- SSOT: [../../GDD.md](../../GDD.md) §6 · 게임 시스템: [../03-game-systems.md](../03-game-systems.md) · 테스트: [../04-testing.md](../04-testing.md)
- 아트 방향: [../adr/0009-procedural-bacon-art-and-continuous-dev.md](../adr/0009-procedural-bacon-art-and-continuous-dev.md)

최종 수정: 2026-07-08
