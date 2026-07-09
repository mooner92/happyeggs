# M5 스펙 — 야간 + 스킨 (Night & Skins)

> [GDD](../../GDD.md) §8.1 ⑦·§12·§13 **M5**. M4까지의 이벤트·아이템·코인 경제 위에 **계란 스킨 BM 스캐폴드**(상점·소유/장착 저장)와 **야간 스테이지**(열화상 표현 + 불 끄기 적 + 가짜불 스티커 트릭), 스테이지 **진행 흐름**(SHOP/NEXT)을 얹는다.

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Verified** (2026-07-09 — 4증분 구현·Vitest 163·Playwright 9컷, [ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md)) |
| 작성일 | 2026-07-09 |
| 근거 GDD 절 | [GDD](../../GDD.md) §8.1 ⑦ · §12 · §13 M5 |
| 선행 | M4 **Verified** ([M4-enemies-items.md](M4-enemies-items.md)) |
| 구현 브랜치 | `feat/m1-core-loop`(연속 스택) |

## 1. 배경

M4까지 적 6종·아이템·미스리드·도난 연쇄가 완성됐고, [ADR-0011](../adr/0011-gpgp-customer-loop-and-coins.md)로 **코인 경제**(저장 v2, `addCoins` 지출 경로 포함)가 선행됐다. M5는 이 코인을 재화로 쓰는 **스킨 상점**(GDD §12 — 순수 코스메틱, 결제는 스텁)과, 열화상 컨셉의 **야간 스테이지**(GDD §8.1 ⑦ — 불 끄기 적·가짜불 스티커가 열화상과 시너지)를 구현한다. `StageDef.night` 플래그와 `stage_03`(gas·밤) 데이터는 선반영되어 있어 이번에 렌더·이벤트와 연결한다.

## 2. 범위

- **① 스킨 시스템**(GDD §12): `data/skins.ts`의 `SkinDef`(id·name·shell·yolk·price — GDD §12 스키마 준수, pattern·crackFx는 예약 필드) 4종 **classic / golden / mint / choco**. 저장 스키마 **v3**(`ownedSkins`·`equippedSkin`, v1/v2 기록 보존 마이그레이션). 순수 `systems/shop.ts`(`canBuy`/`buySkin` = 코인 차감 + **즉시 장착**, `equipSkin`). `ShopScene`(스킨 카드 그리드 — 프리뷰·가격/OWNED/EQUIPPED, 구매/장착 탭, 지갑 코인 표시, PLAY 버튼). `EggView`가 장착 스킨의 **색 오버라이드**(흰자 틴트·노른자 색)를 적용 — 게임플레이 영향 0.
- **② 야간 스테이지**(GDD §8.1 ⑦): `StageDef.night` + `stage_03`(gas·밤). **열화상 표현**: 화면 전체 **남색 오버레이** 위에, **뜨거운 것**(스토브 글로우·불꽃·조리 중 계란 글로우)만 오버레이 위 depth에서 밝게 렌더 — "뜨거운 것만 밝음"(GDD §13 M5)을 셰이더 없이 레이어링으로 구현.
- **③ 불 끄기 적 `fire_snuffer`**(GDD §8.1 ⑦): 좌측에서 침입(전조) → 스토브에 소화기 조준(윈도우) → **탭으로 저지**(성공 시 퇴장). 실패 = 분사 → **불 꺼짐**(heatCoeff 0 — 조리 정지) + **가짜불 스티커** 부착 — 일반 시야면 속지만 **열화상에서는 차갑게(파랗게)** 보이는 트릭 — 스티커는 진짜 불꽃처럼 **오버레이 위(hot depth)에서 밝게** 렌더해 "불이 있다"는 미스리드를 유지하고, **색(파랑)과 굳은 플리커**가 유일한 단서다(아래 depth로 어둡게 깔면 불 꺼짐이 즉시 들통나 트릭이 성립하지 않음). **스토브 탭으로 재점화**. 야간 스테이지 전용(stage_03부터).
- **④ 진행 흐름**: `ResultScene`에 **SHOP** 버튼(상점 진입) 추가, 클리어 시 **NEXT** 버튼(다음 스테이지가 있을 때만 노출) → scene data로 `stageId` 전달해 `GameScene` 재시작.

## 3. 비범위

| 미루는 곳 | 항목 |
|---|---|
| **M6** | 사운드(SFX 훅 전체 연결)·최종 폴리시·성능 패스·스킨 가격/팁 구간 밸런스 튜닝 |
| **M7** | 앱/스팀 래핑(별도 승인) — 실결제 없음(GDD §12 — 결제는 스텁 유지) |

## 4. 기본안 채택 (2026-07-09 — 미결 없음)

[ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md) 연속 개발 모드에 따라 아래 기본안으로 진행한다(DECISIONS.md 갱신은 통합 시 일괄 처리).

- **스킨 가격** = classic 0(기본 소유·장착) / mint 40 / golden 60 / choco 80 코인 — `SkinDef.price`(GDD §12 스키마), M6 밸런스 패스 튜닝 대상.
- **야간 표현 방식** = 전용 셰이더 대신 **남색 오버레이 + 뜨거운 것 depth 분리**(팔레트 스왑 효과 동등, Canvas 폴백 안전·성능 예산 유리).

## 5. 설계

### 5.1 순수 (systems/·data/)

| 모듈 | 역할 |
|---|---|
| `data/skins.ts` | `SkinDef`(id·name·shell·yolk·price) + `SKINS` 4종. 색은 스킨 데이터 고유값(GDD §12 스키마) |
| `save.ts`(v3) | `ownedSkins: string[]`(classic 항상 포함)·`equippedSkin: string`. v1(→coins 0)·v2(coins 보존) 마이그레이션, 알 수 없는 버전만 리셋 |
| `systems/shop.ts` | `canBuy`(코인 충분 + 미소유), `buySkin`(코인 차감 + ownedSkins 추가 + **즉시 장착**), `equipSkin`(소유한 것만) — Phaser 무의존 |
| `data/enemies.ts`(확장) | `fire_snuffer` 정의(stageUnlock 3, 윈도우 입력 `tap`) — 야간 풀 편입 |
| `stageDef.ts`·`data/stages.ts` | `night?: boolean`(선반영) — `stage_03`(gas·밤) 활성 |
| `CookingModel` 연동 | 불 꺼짐 = 열계수 0 → doneness 진행 정지, 재점화 시 재개(기존 heatCoeff 경로 재사용) |

### 5.2 뷰 (ui/·scenes/, 절차적 — ADR-0009)

`ShopScene`(카드 그리드·구매/장착·PLAY), `NightOverlayView`(남색 오버레이 + 핫 레이어 depth 관리), `FireSnufferView`(침입·분사·퇴장), `StoveView` 확장(불 꺼짐·가짜불 스티커·재점화 탭 존), `EggView` 색 오버라이드(장착 스킨 — blob 형태([ADR-0012](../adr/0012-drift-and-spatula-herding.md))는 그대로), `ResultScene` SHOP/NEXT 버튼.

## 6. 구현 순서 (커밋 — 증분)

| # | 커밋 | 검증 |
|---|---|---|
| 1 | `feat: skin system — skins data, save v3, shop scene, egg color override` | Vitest(save v3·shop) + Playwright(상점·장착 색 반영) |
| 2 | `feat: night stage — thermal overlay, hot-glow layering, stage_03` | Vitest(stage 필터) + Playwright(야간 렌더 컷) |
| 3 | `feat: fire snuffer — stove off, fake-fire sticker, stove tap relight` | Vitest(정의·조리 정지) + Playwright(성공/실패/재점화) |
| 4 | `feat: progression — result SHOP button, NEXT stage flow` | Vitest(다음 스테이지 선택) + Playwright(NEXT 진행) |

각 증분에서 tsc/lint/test/build 그린 유지(ADR-0009 — 정지 대신 자체 검증).

## 7. 테스트 계획 (Vitest — 순수, 뷰 제외)

- **save v3 마이그레이션**: v1→v3(stages 보존·coins 0·스킨 기본값), v2→v3(coins 보존·스킨 기본값), v3 정상 왕복, 알 수 없는 버전 리셋, `ownedSkins`에 classic 항상 포함, `equippedSkin`이 미소유 스킨이면 classic 폴백.
- **shop 구매/장착 경계**: 코인 부족 `canBuy=false`, 이미 소유 `canBuy=false`, `buySkin` = 정확한 차감 + 즉시 장착 + 중복 호출 무해(재차감 없음), `equipSkin` 미소유 무시, 지갑 0 미만 방지(기존 `addCoins` 경로).
- **야간/적**: `fire_snuffer` 정의 검증(stageUnlock·입력 키), 야간 스테이지 풀 필터, 불 꺼짐(heatCoeff 0) 동안 doneness 불변 → 재점화 후 재개.
- 렌더링(오버레이·스티커·상점 UI)은 테스트하지 않는다 — Playwright 시각 QA로 대체(GDD §0 규칙 4).

## 8. 인수 조건 (GDD §13 M5)

- [x] 상점에서 스킨 구매 → 즉시 장착 → 게임에서 계란 색 반영, 새로고침 후에도 localStorage에서 복원
- [x] `stage_03` 야간 렌더 — 남색 오버레이 + 뜨거운 것(스토브·불꽃·조리 중 계란)만 밝게 (Playwright)
- [x] `fire_snuffer` 성공(탭 저지)·실패(불 꺼짐 + 가짜불 스티커 — 열화상에서 파랗게)·스토브 탭 재점화 전부 재현
- [x] 클리어 → NEXT로 다음 스테이지 진행(scene data `stageId` 전달), Result에서 SHOP 진입
- [x] `npm run test` 그린(163) + Playwright + 콘솔 에러 0

## 9. as-built

### 2026-07-09 — 증분 1~4 완료 (병렬 빌드: 워크플로 3에이전트 + 통합)

- **스킨**: `data/skins.ts`(classic/golden 60/mint 40/choco 80), 저장 v3(`ownedSkins`·`equippedSkin`, v1·v2 기록/코인 보존 마이그레이션 — 리셋 아님), `shop.ts`(canBuy/buySkin=차감+즉시 장착), `ShopScene`(2열 카드·EQUIPPED 초록 테두리·잔액 부족 흔들림·PLAY), `EggView` 스킨 오버라이드(whiteTint는 밝은 흰자에서만 — BURNT 가독성 유지).
- **야간**: `StageDef.night` + stage_03(**brazier** — 주황 숯 ↔ 가짜불 파랑 대비 확보). 남색 오버레이(depth 60) 아래는 차갑게, 뜨거운 것(불꽃·글로우 depth 62·조리 계란 depth 63)만 밝게. 계란은 열화상답게 오버레이 위 렌더.
- **불 끄기 적**: `fire_snuffer`(stageUnlock 3, tap 저지) + `SnufferView`(좌측 잠입→소화기 들어올림→분사). 실패=`fire_out` → `fireOn=false`(유효 열 0, 조리·스팀 정지) + 가짜불 스티커(차가운 파란 불꽃, 굳은 플리커). 팬/스토브 근처 탭 = 재점화(크랙/밀기보다 우선 라우팅).
- **진행 흐름**: Result 버튼 2줄 — SHARE/RETRY(같은 스테이지 유지) + SHOP/NEXT(클리어+다음 존재 시). GameScene이 씬 데이터 `stageId` 수신(URL보다 우선).
- **검증**: Vitest 163(+10: save v3 마이그레이션·shop 경계), Playwright `verify-m5-night-shop` 9컷(야간 개요·열 글로우·소화→가짜불→조리 정지→재점화·상점 구매 100→40·인게임 골든 노른자) 콘솔 에러 0. tsc/lint/build 그린.

## 관련 문서

- SDD: [README.md](README.md) · 선행: [M4-enemies-items.md](M4-enemies-items.md)
- SSOT: [../../GDD.md](../../GDD.md) §8.1 ⑦·§12·§13 · 결정 로그: [../DECISIONS.md](../DECISIONS.md)
- 근거 ADR: [0009 — 연속 개발](../adr/0009-procedural-bacon-art-and-continuous-dev.md) · [0011 — 코인 경제](../adr/0011-gpgp-customer-loop-and-coins.md) · [0012 — 드리프트/뒤집개](../adr/0012-drift-and-spatula-herding.md)

최종 수정: 2026-07-09 (Verified) (Approved — 구현 대기)
