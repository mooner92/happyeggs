# ADR 0002 — 자체 경량 EventBus, 외부 상태관리 라이브러리 금지

> 씬 간·모델-뷰 간 통신을 **씬 로컬 상태 + 자체 경량 typed EventBus**로 해결하고,
> Redux류 외부 상태관리 라이브러리를 도입하지 않는다는 기록이다 ([GDD](../../GDD.md) §3 고정).

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0002 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | [GDD](../../GDD.md) §3 (SSOT 고정 사항) |
| 영향 범위 | `src/systems/EventBus.ts` · `src/systems/events.ts` (예정 — [M0 스펙](../specs/M0-skeleton.md)) |
| 관련 ADR | [0001 — 기술 스택](0001-tech-stack-phaser-vite-ts.md) |

## 맥락 (Context)

- 초기 로드 번들 < 3MB 예산에서 외부 의존성 하나하나가 비용이다 (GDD §2).
- 게임 상태는 매 프레임 tick으로 진행된다(익힘 doneness, 블롭 정점). 구독-스냅샷 방식의 리액티브 스토어와 상성이 맞지 않고, per-frame 할당 금지 규약과도 충돌 여지가 있다.
- 실제로 필요한 것은 "도메인 이벤트 발행/구독" 수준이다 — 계란 깨짐, 익힘 상태 전이, 연기 경고 등.

## 결정 (Decision)

- 외부 상태관리 라이브러리(전역 리액티브 스토어)는 **금지**한다.
- 상태는 **씬 로컬**로 소유하고, 도메인 간 통신은 **자체 경량 typed EventBus**(pub/sub)로 한다.
- 이벤트 이름·페이로드 타입은 **`src/systems/events.ts` 한 파일**에 사전(dictionary)으로 선언한다 (`domain:action` 네이밍).
- EventBus는 Phaser 미의존 순수 TS로 작성한다 — Vitest(node) 테스트 대상.

## 근거 (Rationale)

- **번들 예산**: 자체 pub/sub는 수십 줄이면 충분하지만, 외부 스토어는 KB 단위 코드 + 별도 학습 규약을 끌고 온다.
- **게임 루프와의 정합**: 매 프레임 변하는 수치를 스토어에 넣으면 구독 알림이 프레임마다 발화해 오버헤드·per-frame 할당을 유발한다. 이벤트는 "전이가 일어난 순간"에만 발행하면 된다.
- **의존성 최소·테스트 용이**: 순수 TS EventBus는 시드·dt 주입 설계(결정론 원칙)와 함께 node 환경에서 그대로 테스트된다.

## 대안 (Alternatives)

| 대안 | 채택하지 않은 이유 |
|---|---|
| Redux / Zustand | 전역 리액티브 스토어는 프레임 단위 게임 상태와 불일치. 번들·보일러플레이트 비용. GDD §3이 명시적으로 금지 |
| Phaser Registry / EventEmitter | 엔진 내장이라 추가 비용은 없으나 **타입 안전이 없다**(문자열 키 + any 페이로드). 순수 모델(`systems/`)이 Phaser를 import하게 되어 순수 모델/뷰 분리 원칙 위반 |

## 결과 (Consequences)

**좋아진 점**

- 이벤트 사전(`events.ts`) 단일 선언으로 "게임에서 일어나는 일"의 계약이 한 파일에 모인다 — 이벤트명 오탈자·페이로드 불일치는 컴파일 에러가 된다.
- 코어 로직이 Phaser 없이 테스트 가능하다.

**감수할 점 / 후속 규약**

- **리스너 해제 규약 필요**: 씬 shutdown 시 등록한 리스너를 해제하지 않으면 누수·유령 콜백이 생긴다. 규약은 [../02-architecture.md](../02-architecture.md)에 명시한다.
- emit 도중 off가 일어나도 안전해야 한다 — EventBus 유닛테스트 항목으로 고정한다 ([M0 스펙](../specs/M0-skeleton.md) 테스트 계획).
- 전역 스토어가 없으므로 스테이지 간 지속 상태(진행도·스킨)는 localStorage 래퍼(M3+)가 담당한다.

---

## 관련 문서

- ADR 인덱스: [README.md](README.md) · SSOT: [../../GDD.md](../../GDD.md) §3
- 상위 설계: [../02-architecture.md](../02-architecture.md) · 게임 시스템: [../03-game-systems.md](../03-game-systems.md)
- 이전 ADR: [0001-tech-stack-phaser-vite-ts.md](0001-tech-stack-phaser-vite-ts.md) · 다음 ADR: [0003-sdd-document-structure.md](0003-sdd-document-structure.md)

최종 수정: 2026-07-07
