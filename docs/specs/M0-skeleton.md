# M0 스펙 — 뼈대 (Skeleton)

> [GDD](../../GDD.md) §13 **M0 — 뼈대**의 구현 스펙이다. 3개 관점(순수 로직 / Phaser 아키텍처 / 확장성-YAGNI) 독립 드래프트와 2중 교차 비평(GDD 충실도 / 스코프·리스크)을 거친 종합안을 [스펙 템플릿](README.md) 구조로 정식 이관했다.
> **상태는 Proposed — 디렉터 승인 전까지 구현에 착수하지 않는다.**

## 머리말

| 항목 | 내용 |
|---|---|
| 상태 | **Proposed (디렉터 승인 대기)** |
| 작성일 | 2026-07-07 |
| 근거 GDD 절 | [GDD](../../GDD.md) §13 M0 (보조: §2 성능 예산 · §3 스택 · §5 템포 · §6 계란 시스템 · §14 아트 규약) |
| 구현 브랜치 | `feat/m0-skeleton` — 승인 후 생성 (현재 코드 0줄) |
| 미결 [DECISION] | M0-1 ~ M0-5 — [../DECISIONS.md](../DECISIONS.md) 표 2 (§10 요약 참조) |

## 1. 배경

GDD §13은 M0 범위를 다음과 같이 고정한다: Vite+Phaser+TS 셋업, 씬 구조(Boot/Preload/Game/Result), 세로 레이아웃 + 스케일 매니저, 양손+팬 렌더(도형), 탭으로 계란 깨기 → 블롭 생성/퍼짐, 익힘 FSM(색 변화), 디버그 HUD(상태/타이머/fps).

GDD가 정한 인수 조건: "`npm run dev`로 폰 브라우저에서 계란 깨고 타는 것까지 눈으로 확인 가능. 익힘 모델 Vitest 통과."

> [!NOTE]
> 이 문서의 실행 명령(`npm run dev` / `npm run build` / `npm run test` / `npm run lint`)은 전부 **예정**이다 — 현재 레포는 코드 0줄, 문서 단계다.

## 2. 범위 (M0에서 만드는 것)

- 프로젝트 스캐폴드: Vite + Phaser 3 + TypeScript(strict) + Vitest + eslint/prettier ([ADR-0001](../adr/0001-tech-stack-phaser-vite-ts.md))
- 씬 4종 배선: Boot → Preload → Game (+ Result 스텁, 디버그 버튼으로만 진입)
- 세로 9:16 FIT 스케일링 + 논리 해상도 (M0-1 확정 필요)
- 양손 + 팬 placeholder 도형 렌더 (GDD §14: programmer art)
- `pointerdown` 탭 → 팬 위 계란 깨기(최대 3개) → 블롭 생성·퍼짐 (GDD §6.1)
- 익힘 FSM `RAW → SET → PERFECT_WINDOW → OVERDONE → BURNT → SMOKE` — placeholder 색 변화로 표현 (GDD §6.2)
- 디버그 HUD: 계란별 상태/doneness/타이머 + fps

## 3. 비범위 (YAGNI 경계 — 미루는 것)

| 미루는 곳 | 항목 |
|---|---|
| **M1+** | 뒤집기 게이지/판정, 원형도 채점(geometry 유틸 포함), 서빙, 손님 큐, 흰자 융합, 노른자 파손(렌더만 함), 재고 |
| **M2+** | 이벤트 스케줄러, telegraph 파이프라인, 오브젝트 풀링(적/파티클 등장 시) |
| **M3+** | 실패 조건 3종 처리(스프링클러 → Result 자동 전환 금지), 스테이지 JSON 로더, localStorage 래퍼(GDD §3 항목이나 M0 불필요 — 연기 판단 기록), PNG 공유 |
| **M5+** | 스킨 스키마, 열화상 셰이더 |

그 외 미래 기능의 코드·타입·빈 클래스는 만들지 않는다.

## 4. 설계

### 4.1 설계 원칙 (3가지 확장 투자만)

1. **순수 모델 / 뷰 분리**: `src/systems/`와 `src/data/`는 Phaser import 금지(eslint `no-restricted-imports`로 기계 강제). Vitest가 node 환경에서 canvas mock 없이 돈다 — M1 채점·뒤집기 판정 테스트의 전제.
2. **결정론**: 시간은 전부 dt 주입, 난수는 전부 시드 기반 — 동일 시드·동일 dt 시퀀스 = 동일 결과.
3. **블롭 = 폴리곤 정점 배열 유지**: M1 원형도 채점 Q = 4πA/P²가 이 배열을 무수정으로 소비한다. (단, 채점 코드 자체는 M0에서 만들지 않는다.)

### 4.2 디렉터리 구조

```
happyeggs/
├─ index.html            # 세로 뷰포트 메타, touch-action:none, user-scalable=no, 100dvh
├─ package.json          # dev / build / test / lint 스크립트 (전부 예정)
├─ tsconfig.json         # strict: true
├─ vite.config.ts        # base: './' — Vercel/GH Pages/itch.io 무설정 호환 (GDD §3)
├─ vitest.config.ts      # node 환경 (순수 로직만 테스트 — 렌더 테스트 금지 규약)
├─ eslint.config.js / .prettierrc
├─ CLAUDE.md             # 작업 규칙 (문서 단계에서 기작성)
├─ GDD.md                # (기존, SSOT — 무수정 보존)
├─ docs/                 # 문서 체계 — ADR-0003 (02-architecture.md · DECISIONS.md · adr/ · specs/)
└─ src/
   ├─ main.ts            # Phaser.Game 부트스트랩 (FIT + autoCenter, 논리 해상도)
   ├─ scenes/
   │  ├─ BootScene.ts    # 최소 초기화 → Preload
   │  ├─ PreloadScene.ts # assets.ts 매니페스트 순회 로더(현재 빈 배열 — 파이프만 증명)
   │  ├─ GameScene.ts    # 오케스트레이터: pointerdown 배선, dt 클램프, 모델 tick → 뷰 갱신
   │  └─ ResultScene.ts  # 스텁 — 디버그 버튼으로만 진입 (실패 플로우는 M3)
   ├─ systems/           # ★ 순수 TS — Phaser import 금지, Vitest 대상 (테스트 co-locate)
   │  ├─ EventBus.ts     # 자체 경량 typed pub/sub (on/off/emit, emit 중 off 안전)
   │  ├─ events.ts       # 이벤트 이름/페이로드 타입 사전 — M0 3종
   │  ├─ noise.ts        # 시드 기반 1D 밸류 노이즈, 출력 [-1,1] (M0-4)
   │  ├─ CookingModel.ts # 익힘 FSM — §6 전이표
   │  └─ EggBlobModel.ts # 방사형 정점 블롭: 생성/퍼짐/이웃 스무딩 (in-place 갱신)
   ├─ ui/
   │  ├─ views/
   │  │  ├─ PanView.ts   # 팬 원판+손잡이 도형, containsPoint(x,y) 크랙 판정
   │  │  ├─ HandsView.ts # 양손 도형 placeholder (M0 정적)
   │  │  └─ EggView.ts   # 블롭 폴리곤 + 노른자(중심 원) 렌더 — Point[] 사전 할당, x/y만 mutate
   │  └─ DebugHud.ts     # 계란별 상태/doneness/타이머 + fps — 250ms 스로틀, ?debug=1 토글
   └─ data/
      ├─ balance.ts      # ★ 밸런스 수치 전부 (COOK / HEAT / EGG / DEBUG, as const)
      ├─ assets.ts       # 에셋 키 매니페스트 — 빈 목록 + AssetEntry 타입 (GDD §14)
      ├─ palette.ts      # placeholder 5색 + 익힘 상태별 색 (RAW 알파 포함) — M0-5
      └─ layout.ts       # 논리 해상도 + 중앙 액션 칼럼 기준 배치 비율 (DECISION-05 대비) — M0-5
```

> [!NOTE]
> 계획 초안은 루트 `ARCHITECTURE.md`·`docs/DECISIONS.md` 신설을 M0 커밋에 포함했으나, 문서 체계가 [ADR-0003](../adr/0003-sdd-document-structure.md)으로 확정되어 해당 문서([../02-architecture.md](../02-architecture.md)·[../DECISIONS.md](../DECISIONS.md))는 문서 단계(main 브랜치)에서 이미 작성되었다. 이에 따라 §7의 커밋 2는 "신규 작성"이 아니라 "구현 확정 사항 동기화"로 조정되었다.

## 5. 파일 단위 계획 — 공개 API

| 파일 | 역할 / 공개 API |
|---|---|
| `systems/CookingModel.ts` | `new CookingModel(cfg = BALANCE.COOK)`, `update(dtSec, heatCoeff): CookState[]` — **이번 틱에 발생한 전이 목록 반환**(큰 dt로 다중 임계 통과 시 중간 상태 유실 방지). getter: `state`, `doneness`, `progressInState`(0~1, 색 보간용), `smokeElapsed`. `heatCoeff` 주입식 — M5 "불 끄기"는 0 전달로 해결 |
| `systems/EggBlobModel.ts` | `createBlob(seed, cx, cy, cfg)`, `stepSpread(blob, dtSec)` — 정점 배열 in-place 갱신(per-frame 할당 0), `getPolygon(blob)` — 각도 순서 보존(M1 채점 전제를 계약 테스트로 고정) |
| `systems/noise.ts` | `createNoise1D(seed): (t) => number` — 자체 구현(의존성 0), 동일 시드 = 동일 출력 |
| `systems/EventBus.ts` + `events.ts` | typed pub/sub + `interface GameEvents` M0 3종: `egg:cracked`, `cook:stateChanged`, `cook:smokeCritical`. `domain:action` 네이밍 규약 명문화, 향후 도메인(`flip:*` 등)은 주석 예약만. 씬 shutdown 시 리스너 해제 규약은 [../02-architecture.md](../02-architecture.md)에 명시 ([ADR-0002](../adr/0002-custom-eventbus-no-state-lib.md)) |
| `data/balance.ts` | `COOK`(임계 5종 + SPRINKLER_DELAY, 단위: 초), `HEAT: Record<HeatSourceId, {base, jitter?}>` — GDD §6.2 5종 계수 전부 선기입(스펙 값), 캠프파이어 ±0.3은 jitter 필드. M0는 gas만 사용. `EGG`(VERTEX_COUNT=48 등), `DEBUG`(MAX_EGGS=3, MAX_DT_SEC=0.1 — **M0-3 미결, 기본안**, HUD_INTERVAL_MS=250) |
| `scenes/GameScene.ts` | pointerdown → 팬 영역이면 계란 생성(`MAX_EGGS` 상한) → `update()`에서 `min(dt, MAX_DT)` 클램프 후 모델 tick → 전이를 bus로 발행 → 뷰 갱신 |

## 6. 익힘 FSM 상태 전이표

`doneness`(유효 조리 시간, 초) = Σ `dtSec × heatCoeff`. 상태는 별도 저장 없이 doneness에서 **파생**된다 — 전이 로직이 임계 비교 5줄이 되고, 경계값 테스트가 단순해진다. **단방향·역행 없음. 비교는 전부 `≥`(닫힌 하한) 통일.**

| 현재 상태 | 다음 상태 | 전이 조건 (`balance.ts` 상수, 초기 시안) | placeholder 표현 |
|---|---|---|---|
| RAW | SET | `doneness ≥ COOK.SET_AT` (3.0) | 반투명 흰자 → 불투명 시작 |
| SET | PERFECT_WINDOW | `doneness ≥ COOK.PERFECT_START` (6.0) | 흰자 완전 불투명 |
| PERFECT_WINDOW | OVERDONE | `doneness ≥ COOK.PERFECT_END` (8.0) | 가장자리 갈변 |
| OVERDONE | BURNT | `doneness ≥ COOK.BURNT_AT` (11.0) | 짙은 갈색 → 검정 |
| BURNT | SMOKE | `doneness ≥ COOK.SMOKE_AT` (13.0) | 검정 + HUD "SMOKE!" 경고 |
| SMOKE | **(M0 종단)** | `smokeElapsed ≥ COOK.SPRINKLER_DELAY` (3.0) → `cook:smokeCritical` 발행 + HUD 점멸 | 스프링클러 실패 연출·스테이지 종료는 **M3 소관** |

- 초기값은 GDD §5 "8~15초/판" 기준 **시안**이다(확정 아님) — 전부 `balance.ts`에서만 조정한다.
- `heatCoeff = 0`이면 doneness 정지 (M5 "불 끄기" 선검증).
- M1 확장 검토 완료: 뒤집기 = 면(面)별 doneness 배열 + 파생 함수 재사용 — FSM 코드 무수정. M0에서는 코드를 선작성하지 않는다.

## 7. 구현 순서 (커밋 12개 — 각각 빌드·테스트 그린 유지)

| # | 커밋 (conventional commits) |
|---|---|
| 1 | `chore: scaffold vite + phaser3 + ts(strict) + vitest + eslint/prettier` — 모바일 메타(touch-action 등)·vite base 포함, 빈 캔버스 확인 |
| 2 | `docs: sync architecture and decision log with m0 scaffold` — 기작성 문서(02-architecture·DECISIONS)에 구현 확정 사항 반영 (§4.2 노트 참조) |
| 3 | `feat: add data modules (balance/assets/palette/layout)` — 상수 홈 먼저, 이후 매직넘버 원천 차단 |
| 4 | `feat: add scene skeleton with 9:16 FIT scaling` — 4씬 배선, 폰 세로 확인 |
| 5 | `feat: add typed event bus and m0 event definitions` (+test) |
| 6 | `feat: add seeded 1d value noise` (+test) |
| 7 | `feat: add egg blob model (radial vertices, spread, smoothing)` (+test) |
| 8 | `feat: add cooking fsm model` (+test) — **여기까지가 인수 조건 Vitest 분** |
| 9 | `feat: render pan and hands placeholders` |
| 10 | `feat: crack eggs on pointerdown and render spreading blobs` |
| 11 | `feat: drive cooking states with color changes and smoke warning` |
| 12 | `feat: add debug hud (state/doneness/timer/fps)` — Result 디버그 진입 버튼 포함 → **정지, 리뷰 대기** |

## 8. 테스트 계획 (Vitest — 순수 로직만)

| 대상 | 케이스 |
|---|---|
| `CookingModel` | 임계 5곳 경계값 직전/정확(`≥`) · dt 분할 불변성(1000ms 1회 == 10ms×100회) · GDD 실계수 스케일링(0.8/1.3/2.5 파라미터라이즈드) · `heatCoeff=0` 정지 · 상태 단조성(역행 금지) · 큰 dt 1회에도 전이 목록 무손실 · `smokeCritical` 정확히 1회 · dt≤0 방어 |
| `EggBlobModel` | 동일 시드 결정성 / 다른 시드 상이 · 정점 수 = `VERTEX_COUNT` · 평균 반경 단조 증가·상한 준수 · 이웃 스무딩 상한 · 배열 참조 재사용(per-frame 할당 금지 계약) · `getPolygon` 각도 순서 보존 |
| `noise` | 시드 결정성 · 출력 범위 [-1,1] · 연속성(\|Δ\| 상한) |
| `EventBus` | on/emit/off · unsubscribe · emit 중 off 안전 · 미등록 이벤트 no-op |

렌더링 테스트는 작성하지 않는다 (GDD §0 규약). 테스트는 대상 파일 옆에 co-locate한다.

## 9. 인수 조건

GDD §13 M0 인수 조건 대응 절차 (구현 완료 후 수행 — 명령은 현재 전부 예정):

1. `npx vitest run` 전체 통과 (익힘 모델 포함)
2. `npm run dev -- --host` → 동일 네트워크 폰 브라우저 접속
3. 육안 체크: 세로 9:16 → 팬 탭으로 계란 깨기(최대 3개) → 블롭 퍼짐 → RAW→…→SMOKE 색 변화 → HUD 상태/fps
4. 보고 후 **정지, 리뷰 대기**

체크리스트:

- [ ] Vitest 전체 그린 (CookingModel / EggBlobModel / noise / EventBus)
- [ ] 폰 브라우저에서 세로 9:16 표시 (FIT + autoCenter)
- [ ] 팬 탭 → 계란 최대 3개 생성, 블롭 퍼짐 육안 확인
- [ ] RAW → SET → PERFECT_WINDOW → OVERDONE → BURNT → SMOKE 색 변화 육안 확인
- [ ] SMOKE 3초 후 `cook:smokeCritical` 발행 + HUD 점멸 (스테이지 종료 없음 — M3 소관)
- [ ] 디버그 HUD: 계란별 상태/doneness/타이머 + fps 표시, `?debug=1` 토글
- [ ] 커밋 12개 각각에서 빌드·테스트 그린 유지 확인

## 10. 미결 [DECISION] — 승인 필요 (M0-1~5)

구현 착수 전 확정이 필요한 5건이다. 기본안·트레이드오프의 상세는 **[../DECISIONS.md](../DECISIONS.md) 표 2**가 단일 로그다(여기에 중복 기재하지 않는다).

- **M0-1 논리 해상도** — 추천: 720×1280 (대안: 540×960)
- **M0-2 SMOKE→스프링클러 3초의 시계 기준** — 추천: 실시간(dt 누적) (대안: 열원 연동)
- **M0-3 백그라운드(탭 이탈) 복귀 처리** — 추천: dt 클램프 0.1초 → 사실상 익힘 정지
- **M0-4 노이즈 구현** — 추천: 자체 1D 밸류 노이즈 (GDD 표기 "Perlin"의 대체)
- **M0-5 "balance.ts 한 파일" 해석** — 추천: 튜닝 수치만 balance.ts, 색은 palette.ts·좌표는 layout.ts

## 11. 승인 후 절차

디렉터가 M0-1~5를 확정([../DECISIONS.md](../DECISIONS.md) 갱신 + [ADR](../adr/README.md) 승격)하고 이 스펙을 승인하면:

1. **이 문서의 상태를 Approved로 변경한 후 구현에 착수한다.**
2. 브랜치 `feat/m0-skeleton`을 생성하고 §7의 커밋 순서대로 진행한다.
3. 완료 시 §9 인수 절차 수행 → `Implemented` → `Verified` → as-built 갱신 → **정지·리뷰 대기** ([SDD 루프](README.md)).

---

## 관련 문서

- SDD 프로세스·템플릿: [README.md](README.md) · 미결 로그: [../DECISIONS.md](../DECISIONS.md)
- SSOT: [../../GDD.md](../../GDD.md) §13 M0 · 마일스톤 체크리스트: [../../WORKPLAN.md](../../WORKPLAN.md)
- 아키텍처: [../02-architecture.md](../02-architecture.md) · 게임 시스템: [../03-game-systems.md](../03-game-systems.md) · 테스트 전략: [../04-testing.md](../04-testing.md)
- 관련 ADR: [0001 — 기술 스택](../adr/0001-tech-stack-phaser-vite-ts.md) · [0002 — 자체 EventBus](../adr/0002-custom-eventbus-no-state-lib.md) · [0003 — SDD 문서 체계](../adr/0003-sdd-document-structure.md)

최종 수정: 2026-07-07
