# ADR 0005 — SMOKE→스프링클러 유예 시간은 실시간 기준

> SMOKE 진입 후 3초(GDD §6.2) 유예의 시계 기준을 기록한다. [../DECISIONS.md](../DECISIONS.md)의 **M0-2** 승격분이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0005 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | 디렉터 (M0 스펙 승인 시 기본안 일괄 채택) |
| 영향 범위 | `src/systems/CookingModel.ts`(smokeElapsed), M3 스프링클러 실패, M5 "불 끄기" 규칙 |
| 관련 ADR | [0006 — dt 클램프](0006-dt-clamp-background.md) |

## 맥락 (Context)

- GDD §6.2: SMOKE 진입 후 3초 방치 → 스프링클러 → 스테이지 즉시 실패. doneness는 `Σ dt × 열원계수`로 적분되므로, 이 3초를 doneness처럼 열원 계수에 연동할지 실제 경과 시간으로 잴지 갈림길이 있었다.
- M5 야간 "불 끄기" 적은 열원 계수를 0으로 만든다 — 계수 연동이면 불이 꺼진 순간 연기 타이머도 멈춘다.

## 결정 (Decision)

SMOKE 유예 시간(`smokeElapsed`)은 **실시간(dt 누적, 열원 계수와 무관)** 으로 잰다. 값(`SPRINKLER_DELAY` = 3.0초)은 `balance.ts`에 둔다.

## 근거 (Rationale)

- "이미 타서 연기가 나는 계란은 불을 꺼도 연기가 계속 난다"가 물리 직관에 맞고, 플레이어에게 명확하다.
- M5 불 끄기 이벤트가 "익힘은 멈추되 연기 위기는 계속"이라는 긴장을 유지한다.

## 대안 (Alternatives)

- **열원 계수 연동** — 모델 일관성(모든 시간이 유효 조리 시간)은 있으나, 불을 꺼서 스프링클러를 회피하는 의도치 않은 전략이 생긴다.

## 결과 (Consequences)

- `CookingModel`은 doneness(계수 곱)와 smokeElapsed(실시간)를 **별도로** 적분한다.
- dt 클램프(ADR-0006)가 적용되므로 백그라운드 이탈 중에는 연기 시계도 사실상 멈춘다 — 의도된 동작.

---

## 관련 문서

- 미결 로그(원 항목 M0-2): [../DECISIONS.md](../DECISIONS.md) · 익힘 FSM: [../03-game-systems.md](../03-game-systems.md)
- 인덱스: [README.md](README.md)

최종 수정: 2026-07-07
