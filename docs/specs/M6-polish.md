# M6 스펙 — 폴리시 (Polish)

> [GDD](../../GDD.md) §13 **M6**·§14·§2. M5까지 완성된 전 콘텐츠(코어 루프·이벤트·아이템·야간·스킨 상점) 위에 **절차적 SFX**(현재 무음 → WebAudio 합성으로 전 훅 연결), **게임필 연출**, **성능 패스**, **밸런스 1차 시트**를 얹어 v1 웹 출시 직전 상태로 마감한다.

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Implemented** (2026-07-09 — SFX·게임필·시트 완료. Verified 전환 조건: 디렉터 폰 실측 60fps 확인) |
| 작성일 | 2026-07-09 |
| 근거 GDD 절 | [GDD](../../GDD.md) §13 M6 · §14(SFX 리스트) · §2(성능 예산) |
| 선행 | M5 **Verified** ([M5-night-skins.md](M5-night-skins.md)) |
| 구현 브랜치 | `feat/m1-core-loop`(연속 스택) |

## 1. 배경

M5까지 게임플레이 콘텐츠는 전부 붙었다 — 코어 루프(깨기·굽기·뒤집기·서빙), 이벤트 7종, 아이템·도난 연쇄, 야간 열화상, 스킨 상점·코인 경제. 그러나 게임은 아직 **완전 무음**(GDD §14 — SFX는 스텁 훅만)이고, 서빙·깨기 같은 핵심 순간의 피드백 연출이 얇으며, 성능 예산(GDD §2 — 폰 60fps·초기 번들 < 3MB)은 실측 기록이 없고, `balance.ts` 수치는 튜닝 시트 없이 M1~M5 기본안 그대로다. M6는 이 네 축을 마감하는 폴리시 마일스톤이다(WORKPLAN M6). 오디오는 [ADR-0009](../adr/0009-procedural-bacon-art-and-continuous-dev.md)의 절차적 아트 노선을 그대로 따른다 — **에셋 파일 없이 WebAudio로 합성**해 번들 증가 0을 유지하고, 추후 실제 오디오 에셋로의 교체 경로(키 매핑)만 남긴다.

## 2. 범위

- **① 절차적 SFX**(GDD §14): 오디오 에셋 없이 **WebAudio 오실레이터(사인/사각/삼각 스윕) + 노이즈 버퍼 합성**으로 전 SFX를 코드에서 생성 — 에셋·번들 증가 0(ADR-0009 노선). `ui/audio.ts` **싱글턴**(AudioContext 지연 생성, SFX별 합성 레시피, 지글지글 루프는 doneness 따라 피치 상승 — GDD §14). **모바일 자동재생 정책 대응**: 첫 사용자 제스처(`pointerdown`)에서 AudioContext **unlock/resume**, 그 전에는 무음·무에러. **전 게임플레이 훅 연결**: 깨기 / 뒤집기 / 착지 / 서빙 / 코인 획득 / 밀기(shoo) / 이벤트 전조·성공·실패 / 불 끄기·재점화 / 스프링클러 / 클리어·게임오버 / UI 탭 / 상점 구매.
- **② 게임필**: (a) **서빙 비행 연출** — 스와이프 서빙 성공 시 후라이가 손님(말풍선)에게 포물선으로 날아가 축소·소멸, (b) **깨기 껍데기 파편** — 깨는 순간 껍데기 조각이 튀어 낙하(간이 중력), (c) **착지 미세 카메라 반동** — 계란 착지 시 수 픽셀·수십 ms의 짧은 반동(과장 금지).
- **③ 성능 패스**(GDD §2): 번들 **실측 — gzip 336KB < 3MB ✓**(절차적 아트·오디오 덕에 예산 여유 큼). **헤드리스 fps 57~60 기록**(Playwright rAF 계측). update 루프 per-frame 할당 0 점검(GDD §0 규칙 5). 텍스처 아틀라스는 절차적 생성 텍스처(ADR-0009)라 해당 없음 — 점검만. **폰 실측 60fps(미드레인지 안드로이드 크롬)는 디렉터 기기 확인 항목**으로 남긴다(이 환경에서 실기 측정 불가).
- **④ 밸런스 1차**: [docs/06-balance-sheet.md](../06-balance-sheet.md) 튜닝 시트(별도 에이전트 작성 — `balance.ts` 전 상수 표 + 튜닝 가이드) 링크. **현행 값 유지** — QA 플레이 실측 점수 avg 93~99로 목표 난이도 대비 적정 판단, 수치 변경은 시트 기반으로 추후 진행.

## 3. 비범위

| 미루는 곳 | 항목 |
|---|---|
| **M7** | 앱/스팀 래핑(Capacitor·Electron) — GDD §13대로 **별도 승인** 전 착수 금지 |
| **추후** | 실제 오디오 에셋(녹음/구매) 교체 — 절차적 합성이 placeholder 상위 호환, 레시피 키만 스왑 |

## 4. 설계

### 4.1 순수 (systems/·data/)

| 모듈 | 역할 |
|---|---|
| `data/balance.ts` | **변경 없음** — 현행 값 유지(§2 ④). 튜닝은 [06-balance-sheet.md](../06-balance-sheet.md) 기반으로 추후 |
| `data/layout.ts` | 게임필 연출 상수(비행 시간·파편 개수·카메라 반동 강도/시간) — 판정 무영향 연출 수치이므로 balance 아님([ADR-0008](../adr/0008-balance-file-scope.md)) |
| systems/ | **변경 없음** — 이번 마일스톤은 렌더/오디오 계층 중심, 순수 모델은 기존 이벤트(EventBus) 발화만 소비 |

### 4.2 뷰 (ui/·scenes/, 절차적 — ADR-0009)

- **`ui/audio.ts`** — SFX 싱글턴. AudioContext 지연 생성 + 첫 `pointerdown` unlock. `play(key)` API와 SFX별 합성 레시피(오실레이터 주파수 스윕 + 노이즈 버퍼 + 게인 엔벨로프), 지글지글은 루프 노드로 doneness에 따라 피치 상승. 디버그/QA 시 `window.__sfxLog`에 발화 키를 기록(테스트 계획 §6). 추후 에셋 교체를 위해 **키 → 레시피 매핑** 유지(assets.ts 매니페스트와 동일 사상).
- **훅 배선** — GameScene/ResultScene/ShopScene이 기존 EventBus 이벤트·입력 지점에서 `play(key)` 호출(§2 ① 목록 전체). 새 이벤트 추가 없이 기존 발화 지점에 연결.
- **게임필** — 서빙 비행(후라이 텍스처가 손님 좌표로 포물선 트윈), 껍데기 파편(소량 Graphics 조각, 간이 중력 낙하 후 소멸 — 동시 수가 작아 create/destroy로 충분, 급증 시 풀링), 착지 카메라 반동(Phaser camera shake 미세 파라미터).
- **성능 계측** — Playwright 스크립트에서 rAF 카운트로 fps 기록, `npm run build` 산출물 gzip 실측을 as-built에 남긴다.

## 5. 구현 순서 (커밋 — 증분)

| # | 커밋 | 검증 |
|---|---|---|
| 1 | `feat: procedural sfx — webaudio synth singleton, unlock, core hooks (crack/flip/land/serve)` | Playwright(`__sfxLog` 발화·unlock 전 무에러) |
| 2 | `feat: sfx hooks — events, snuffer/relight, sprinkler, clear/gameover, ui tap, shop, coin` | Playwright(이벤트별 `__sfxLog`) |
| 3 | `feat: game feel — serve flight, shell shards, landing camera kick` | Playwright(연출 컷) + Vitest 기존 그린 유지 |
| 4 | `docs: perf pass record + balance sheet link` | 번들 gzip·헤드리스 fps 실측 기록, [06-balance-sheet.md](../06-balance-sheet.md) 링크 |

각 증분에서 tsc/lint/test/build 그린 유지(ADR-0009 — 정지 대신 자체 검증).

## 6. 테스트 계획

- **오디오는 유닛테스트 제외** — WebAudio는 렌더(브라우저) 계층이라 Vitest 대상 아님(GDD §0 규칙 4 — 순수 로직만). 대신 **Playwright에서 `window.__sfxLog`로 훅 발화를 검증** — 깨기/뒤집기/서빙/이벤트/상점 등 시나리오 재생 후 로그에 기대 키가 순서대로 쌓였는지 확인.
- **자동재생 정책**: 첫 제스처 전 콘솔 에러 0(AudioContext 경고 포함), 첫 `pointerdown` 후 state `running` 확인.
- **게임필**: Playwright 스크린샷 컷(비행 중간 프레임·파편·반동) — 렌더링 유닛테스트 금지 원칙 유지.
- **회귀**: 기존 Vitest 163 그린 유지(순수 모델 무변경이므로 신규 유닛테스트 없음), 성능 계측치(fps·번들)는 as-built에 기록.

## 7. 인수 조건 (GDD §13 M6 · WORKPLAN M6 DoD)

- [ ] 전 게임플레이 SFX 훅 발화 — §2 ① 목록 전부가 Playwright `window.__sfxLog`로 확인되고, 지글지글 피치가 doneness 따라 상승
- [ ] 모바일 자동재생 정책 대응 — 첫 제스처 전 무음·콘솔 에러 0, 첫 `pointerdown` 후 소리 재생
- [ ] 게임필 3종 재현 — 서빙 비행 연출·깨기 껍데기 파편·착지 카메라 반동 (Playwright 컷)
- [ ] 성능 — 번들 gzip 실측 < 3MB(현재 336KB) + 헤드리스 fps 57~60 기록 + per-frame 할당 0 점검, **폰 실측 60fps는 디렉터 기기 확인 항목**으로 인계
- [ ] [docs/06-balance-sheet.md](../06-balance-sheet.md) 링크 유효 + 현행 값 유지 근거(QA 실측 avg 93~99) 기록, `npm run test` 그린(163) + tsc/lint/build 그린

## 8. as-built

### 2026-07-09 — SFX·게임필·밸런스 시트 구현

- **절차적 SFX**: `ui/audio.ts` — WebAudio 오실레이터/노이즈 합성 싱글턴(에셋·번들 0). 19키(crack/flip_whoosh/land_clean/land_fold/fly_off/serve/coin/push/telegraph/event_success/event_fail/fire_out/reignite/sprinkler/stage_clear/game_over/ui_tap/buy/denied/star). 첫 제스처 `unlock()`(모바일 자동재생 정책), 미지원 환경 no-op. `window.__sfxLog`로 QA 검증.
- **훅 배선**: GameScene(깨기·뒤집기·착지 2종·발사·서빙·코인·밀기·이벤트 전조/성공/실패·불 꺼짐/재점화·스프링클러·클리어/게임오버), ResultScene(UI 탭·별 팝인 동기), ShopScene(구매·장착·잔액 부족·PLAY).
- **게임필**: 깨기 껍데기 파편 2조각(회전 포물선), 서빙 시 미니 후라이가 맨 앞 손님에게 포물선 비행(장착 스킨 색 반영), CLEAN 착지 미세 카메라 반동(50ms/0.0016).
- **성능**: 번들 gzip 336KB(<3MB ✓), 헤드리스 QA fps 57~60. **폰 실측은 디렉터 기기 확인 대기.**
- **밸런스 1차**: [../06-balance-sheet.md](../06-balance-sheet.md) 시트 발행 — 전 상수 표(의미·GDD 근거·튜닝 노트). QA 실측(밀기 활용 avg 93~99) 기준 현행 유지.
- **검증**: `verify-m6-sfx` — SFX 9키 발화 + 파편/비행 연출 2컷, 콘솔 에러 0. Vitest 165 그린.

## 관련 문서

- SDD: [README.md](README.md) · 선행: [M5-night-skins.md](M5-night-skins.md)
- SSOT: [../../GDD.md](../../GDD.md) §13 M6·§14·§2 · 결정 로그: [../DECISIONS.md](../DECISIONS.md)
- 근거 ADR: [0009 — 절차적 아트·연속 개발](../adr/0009-procedural-bacon-art-and-continuous-dev.md) · [0008 — balance 범위](../adr/0008-balance-file-scope.md)
- 밸런스 시트: [../06-balance-sheet.md](../06-balance-sheet.md)

최종 수정: 2026-07-09 (Approved — 구현 대기)
