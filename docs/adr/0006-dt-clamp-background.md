# ADR 0006 — dt 클램프 0.1초 (백그라운드 복귀 = 사실상 익힘 정지)

> 탭 이탈 후 복귀 시 거대 dt 처리 정책을 기록한다. [../DECISIONS.md](../DECISIONS.md)의 **M0-3** 승격분이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0006 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | 디렉터 (M0 스펙 승인 시 기본안 일괄 채택) |
| 영향 범위 | `scenes/GameScene.update()`(클램프 지점), `data/balance.ts`(`DEBUG.MAX_DT_SEC`) |
| 관련 ADR | [0005 — SMOKE 실시간](0005-smoke-timer-realtime.md) |

## 맥락 (Context)

- 모바일 브라우저는 탭 이탈 시 rAF를 멈추고, 복귀 프레임에 수 초~수 분짜리 delta가 한 번에 들어온다. 무방비면 복귀 순간 계란이 즉시 전소(RAW→SMOKE)한다.
- 모델은 dt 주입식(결정론)이므로, 방어는 모델 밖(씬의 update)에서 dt를 자르는 것으로 충분하다.

## 결정 (Decision)

`GameScene.update()`에서 모델에 넘기는 dt를 **`min(dt, 0.1초)`로 클램프**한다. 상수는 `balance.ts`의 `DEBUG.MAX_DT_SEC`. 결과적으로 **백그라운드 체류 시간은 게임 시간에 반영되지 않는다**(사실상 일시정지).

## 근거 (Rationale)

- 프레임 스파이크(GC, 저사양 히치)와 탭 복귀를 한 가지 메커니즘으로 방어한다.
- "자리를 비운 사이 계란이 다 탔다"는 벌은 아케이드 템포(한 판 8~15초)와 맞지 않는다.

## 대안 (Alternatives)

- **이탈 시간만큼 진행** — 현실적이지만 복귀 즉시 실패를 양산해 비추천.
- **visibilitychange에서 명시적 pause 씬** — M0 범위 밖. 클램프만으로 동작이 동등하며, 명시적 일시정지 UI는 폴리시(M6)에서 재검토.

## 결과 (Consequences)

- 클램프는 씬에만 있고 모델은 모른다 — 모델 테스트는 클램프 없는 순수 dt로 검증한다.
- 0.1초보다 긴 실제 프레임(10fps 미만)에서는 게임 시간이 실시간보다 느려진다 — 감수. M6 성능 패스가 60fps를 보증하는 것으로 상쇄.

---

## 관련 문서

- 미결 로그(원 항목 M0-3): [../DECISIONS.md](../DECISIONS.md) · 성능 전략: [../02-architecture.md](../02-architecture.md) §7
- 인덱스: [README.md](README.md)

최종 수정: 2026-07-07
