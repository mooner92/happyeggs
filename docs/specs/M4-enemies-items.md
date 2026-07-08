# M4 스펙 — 적 확장 + 아이템 (Enemies & Items)

> [GDD](../../GDD.md) §8.1·§9·§13 **M4**. M2 이벤트 프레임워크 위에 나머지 적 4종(재채기·머리카락·파리·저격수)과 **아이템 배치 + 어포던스 미스리드**, RAW 발사→아이템 도난 연쇄를 얹는다.

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Approved** (2026-07-08 — 연속 개발, [ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md)) |
| 작성일 | 2026-07-08 |
| 근거 GDD 절 | [GDD](../../GDD.md) §8.1 ③④⑤⑥ · §9 아이템·미스리드 · §13 M4 |
| 선행 | M3 **Verified** ([M3-stage-system.md](M3-stage-system.md)) |
| 구현 브랜치 | `feat/m1-core-loop`(연속 스택) |

## 1. 배경

M2에서 데이터 주도 이벤트 프레임워크(스폰·telegraph·window·resolve)와 거미·강도를 만들었다. M4는 그 위에 나머지 적을 "JSON + 핸들러 1개"로 추가하고, **아이템**(스테이지 데이터로 배치) + **의도적 미스리드**(방패 decoy)를 도입한다.

## 2. 범위

- **아이템 시스템**: 스테이지 `items[]`(id·pos)로 배치, 탭 가능. 아이템 탭이 대응 입력이 되는 적(재채기·머리카락·저격수). 오답 아이템(decoy) 개그.
- **재채기 손님**(GDD §8.1 ③): **팬 뚜껑 탭**(기본안 [DECISION-01]) → 침 차단. 실패 → **즉시 게임 오버**.
- **머리카락 손님**(GDD §8.1 ④): **토치 탭** 공중 소각(기본안 [DECISION-02]). 실패 → 해당 계란 **−10.000점**.
- **파리**(GDD §8.1 ⑥): 비행 중 탭 무효(티배깅), 착지 후 똥 전조 1초에 탭 → 별 처치. 방치 → **−20.000점**.
- **저격수**(GDD §8.1 ⑤): 레이저 조준 → **펜싱칼 탭**(패링)으로 반사. 직접 탭 시 **+1 증원(최대 3)** [DECISION-04]. 실패 → 후라이 **구멍**(채점 반영). 팬은 방탄.
- **미스리드**(GDD §9): 방패+칼 나란히 → 저격 정답은 칼, 방패 탭은 개그(handle_falls_off). 실패 페널티는 **점수 손해 수준**([DECISION-06], 즉사는 재채기만).
- **도난 연쇄**: RAW 뒤집기 발사체 → 앞 손님이 아이템 훔쳐 도주 → 훔친 게 대응 아이템이면 해당 이벤트 **방어 불가 상태**.

## 3. 비범위

| 미루는 곳 | 항목 |
|---|---|
| **M5** | 야간 열화상·불 끄기 적·스킨 |
| **M6** | 연출 폴리시·SFX |

## 4. 확정 [DECISION] (2026-07-08, 기본안)

- **DECISION-01 재채기 대응** = 팬 뚜껑 탭 (대안 티슈 미채택)
- **DECISION-02 머리카락 대응** = 토치 공중 소각 (대안 미채택)
- **DECISION-04 저격수 증식** = 저격수/레이저 직접 탭 시 +1(최대 3)
- **DECISION-06 미스리드 페널티** = 점수 손해 수준(즉사는 재채기만)

## 5. 설계

### 5.1 순수 (systems/)

| 모듈 | 역할 |
|---|---|
| `enemyDef.ts`(확장) | `InputKey`에 아이템 탭 키(`lid`·`torch`·`fencing_sword`)·`tap`·`parry` 포함 |
| `data/enemies.ts`(확장) | sneeze_troll·hair_troll·fly·sniper 정의 |
| `stageDef.ts`(확장) | `items?: {id, pos}[]` |
| `data/items.ts` | 아이템 정의(id·correctFor·failGag) + 배치 위치 맵 |

### 5.2 뷰 (ui/, 절차적)

`ItemView`(뚜껑·토치·펜싱칼·방패), `SneezeView`·`HairView`·`FlyView`·`SniperView`, 이펙트(별 처치·구멍·머리카락 소각·decoy 개그).

## 6. 구현 순서 (커밋 — 증분)

| # | 커밋 |
|---|---|
| 1 | `feat: item system — stage items, item views, item-tap routing` (Playwright) |
| 2 | `feat: sneeze troll — lid block / miss = game over` (Playwright) |
| 3 | `feat: hair troll — torch burn / miss = -10` (Playwright) |
| 4 | `feat: fly — teabag then poop window / miss = -20` (Playwright) |
| 5 | `feat: sniper — fencing parry, multiply trap, bullet hole` (Playwright) |
| 6 | `feat: decoy misdirection + raw-flip item steal chain` (Playwright) |

## 7. 테스트 계획 (Vitest — 순수)

- 아이템 탭 라우팅(정답 아이템→성공, decoy→실패/무해), 새 적 정의 검증, 감점 합산(−10/−20/구멍), 저격수 증식 상한(≤3), 파리 상태(비행→착지→똥) 전이.

## 8. 인수 조건 (GDD §13 M4)

- [ ] 적 6종(거미·강도·재채기·머리카락·파리·저격수) 전원 성공/실패 재현 (Playwright)
- [ ] 아이템 배치 + 미스리드(방패 decoy 개그) 동작
- [ ] RAW 발사 → 아이템 도난 → 방어 불가 연쇄
- [ ] `npm run test` 그린 + Playwright + 콘솔 에러 0

## 9. as-built

### 증분 1–4 (2026-07-08) — 아이템 + 재채기·머리카락·파리

- **아이템 시스템**: `data/items.ts`(`ITEMS`·`ITEM_POS`), `StageDef.items?`, `ui/views/ItemView.ts`(뚜껑·토치·펜싱칼·방패 절차적 도형 + 탭 존 + 매칭 적 활성 시 초록 힌트 링/진동 + decoy `gag()`). `stage_01`·`stage_02`에 4종 배치.
- **입력 키**: `InputKey`에 `lid`·`torch`·`fencing_sword` 추가 — 아이템 id가 곧 대응 적 `input`. `onItemTap(id)` → 정답이면 `scheduler.tryInput(id)`로 해소, decoy는 `gag()`(무해).
- **재채기 손님**(`SneezeView`): 코 붉어짐 전조 → 팬 방향 침방울 분사(윈도우). 뚜껑 탭 성공(막음 플래시) / 방치 = `game_over_sneeze` → `forceFail('sneeze')` 즉시 종료. `FailReason`에 `'sneeze'` 추가.
- **머리카락 손님**(`HairView`): 구불구불 낙하 → 팬 위 부유(윈도우). 토치 탭 = 공중 소각 / 방치 = `hair_land` → 대상 계란 `hairPenalty`(−10, 서빙 시 합산).
- **파리**(`FlyView`): 티배깅 비행(전조, 탭 무효) → 착지 + 똥방울 부풂(윈도우). 탭 = 별 격추 / 방치 = `fly_poop` → `flyPenalty`(−20). 파리 윈도우 중 탭은 `windowInput==='tap'` 라우팅으로 깨기와 분리.
- **적 스테이지 배정**: 신규 3종은 `stage_02` 풀에 편입(난이도 램프). `stage_01`은 거미·강도 유지.
- **검증**: Vitest 136 통과(+9, `m4Items.test.ts` — 적 정의·아이템 매핑·탭 라우팅·감점). Playwright `verify-m4-enemies.mjs` 12컷(배치·decoy 개그·재채기 성공/게임오버·머리카락 소각·파리 티배깅/착지/격추), 콘솔 에러 0. tsc/lint/build 그린.

### 증분 5 (2026-07-08) — 저격수 + decoy 미스리드

- **저격수**(`SniperView`): 상단에서 팬 조준(점선 스윕, 전조) → 락온 빔(윈도우). `fencing_sword` 탭 = 패링 반사(초록) / 방치 = `bullet_hole` → 대상 후라이에 구멍(`EggView`가 결정론 배치로 렌더).
- **증식 함정**(DECISION-04): 빔/헤드 직접 탭 시 `addBeam()`으로 +1(최대 3, `SNIPER.maxMultiply`). 헤드가 좌우로 벌어지고 빔이 늘어남. 실패 시 구멍 = 증식 수(3빔이면 3구멍). 직접 탭은 `suppressUp`으로 크랙과 분리.
- **decoy 미스리드**(GDD §9): 저격수 활성 시 정답 `fencing_sword`가 초록 힌트, 나란한 `shield_decoy` 탭은 `gag()`(손잡이 툭, 무해) — 일반 아이템 시스템으로 자연히 성립.
- **감점**: `SCORE.deduction.bulletHole = −12`(구멍 1개당, [DECISION-08] 신규 — GDD 수치 미명시). 서빙 점수에 누적.
- **스테이지 번호**: 스케줄러가 하드코딩 1 대신 `STAGES` 순번을 써 `sniper`(stageUnlock 2)가 stage_02부터 실제 등장.
- **검증**: Vitest 139(+3, 저격수 정의·펜싱칼 라우팅·stageUnlock 필터). Playwright 5컷 추가(조준·락온+힌트·패링 성공·3빔 증식·구멍 3개), 콘솔 에러 0. 패링 성공 시 구멍 0 확인.

### 증분 6 (예정) — RAW-flip 발사 → 아이템 도난 연쇄

---

## 관련 문서

- SDD: [README.md](README.md) · 선행: [M2-event-framework.md](M2-event-framework.md)·[M3-stage-system.md](M3-stage-system.md)
- SSOT: [../../GDD.md](../../GDD.md) §8.1·§9 · 결정 로그: [../DECISIONS.md](../DECISIONS.md)

최종 수정: 2026-07-08
