# ADR 0001 — 기술 스택: Phaser 3 + TypeScript(strict) + Vite

> "EGG FLIP (가제)"의 엔진·언어·빌드·테스트 체인을 기록한다.
> [GDD](../../GDD.md) §3이 "고정 — 변경 제안 금지"로 지정한 사항의 ADR 기록이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0001 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | [GDD](../../GDD.md) §3 (SSOT 고정 사항) |
| 영향 범위 | 코드베이스 전체 (현재 코드 0줄 — 문서 단계) |
| 관련 ADR | [0002 — 자체 EventBus](0002-custom-eventbus-no-state-lib.md) |

## 맥락 (Context)

- 1차 타깃은 **모바일 웹(세로 9:16)** + 데스크톱 웹, 2차 타깃은 Capacitor(iOS/Android 앱)·Electron + steamworks.js(Steam)다 (GDD §2).
- 성능 예산이 엄격하다: 미드레인지 안드로이드 크롬 **60fps**, 초기 로드 번들 **< 3MB**, update 루프 내 per-frame 객체 할당 금지 (GDD §2).
- 핵심 오브젝트인 계란 블롭은 `Phaser.GameObjects.Graphics` 폴리곤 + 정점 노이즈로 그리는 **자체 간이 시뮬**이다 — 강체 충돌·중력 해석이 필요한 게임이 아니다 (GDD §6.1).

## 결정 (Decision)

| 결정 항목 | 값 |
|---|---|
| 엔진 | **Phaser 3 최신 안정판** |
| 언어 | **TypeScript, `strict: true`** |
| 빌드 | **Vite** — 정적 빌드, `base` 옵션 유연 (Vercel / GitHub Pages / itch.io 겨냥) |
| 물리 | **물리엔진 미사용** — 자체 간이 시뮬 |
| 테스트 | **Vitest** (순수 로직만 — 렌더링 테스트 금지) |
| 린트/포맷 | eslint + prettier 기본 설정 |

## 근거 (Rationale)

- Phaser 3는 씬·입력·스케일 매니저·로더·트윈을 내장한 성숙한 2D 웹 게임 프레임워크로, 모바일 웹 60fps 목표에서 검증된 선택지다.
- TypeScript strict는 순수 모델(`systems/`·`data/`)과 뷰의 경계 계약을 컴파일 타임에 강제하는 토대다 (순수 모델/뷰 분리 원칙).
- Vite 정적 빌드는 번들 < 3MB 예산 관리(에셋 lazy load)와 다중 호스팅(`base` 유연)에 직결된다.
- 물리엔진은 블롭 시뮬(정점 노이즈 + 이웃 스무딩)에 과한 의존성이다 — 번들과 복잡도만 늘린다.

## 대안 (Alternatives)

| 대안 | 채택하지 않은 이유 |
|---|---|
| Unity (WebGL) | 웹 빌드가 무겁다 — 초기 번들 < 3MB·모바일 웹 60fps 예산과 정면 충돌 |
| PixiJS | 렌더러일 뿐 게임 프레임워크가 아니다 — 씬/입력/스케일/로더를 자작해야 해 M0~M7 일정에 불리 |
| 물리엔진 도입 (Arcade/Matter 등) | 블롭 자체 시뮬에 과함. 판정은 전부 게임 규칙(익힘 FSM·파워 게이지) 기반이라 강체 물리가 필요 없음 |

## 결과 (Consequences)

**좋아진 점**

- 정적 웹 배포가 쉽고(어느 정적 호스트든 무설정), 2차 타깃(Capacitor 앱 래핑, Electron + steamworks.js)이 웹 빌드 재사용으로 자연스럽게 연결된다.
- 의존성 최소 — 익힘 FSM·블롭 모델 등 코어가 순수 TS로 남아 Vitest(node)로 테스트 가능하다.

**감수할 점 / 규약**

- **엔진 교체 제안 금지** — GDD §3이 스택을 고정했다. 성능 문제는 스택 교체가 아니라 구현 방식(오브젝트 풀링·텍스처 아틀라스 등, GDD §2)으로 해결한다.
- 물리엔진이 없으므로 포물선·착지 스쿼시(M1) 등 연출은 트윈 기반 절차 애니로 직접 구현해야 한다.

---

## 관련 문서

- ADR 인덱스: [README.md](README.md) · SSOT: [../../GDD.md](../../GDD.md) §2·§3
- 상위 설계: [../02-architecture.md](../02-architecture.md) · 개요·성능 예산: [../01-overview.md](../01-overview.md)
- 다음 ADR: [0002-custom-eventbus-no-state-lib.md](0002-custom-eventbus-no-state-lib.md)

최종 수정: 2026-07-07
