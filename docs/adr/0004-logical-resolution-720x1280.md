# ADR 0004 — 논리 해상도 720×1280

> 세로 9:16 게임 캔버스의 논리 해상도를 기록한다. [../DECISIONS.md](../DECISIONS.md)의 **M0-1** 승격분이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0004 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | 디렉터 (M0 스펙 승인 시 기본안 일괄 채택) |
| 영향 범위 | `src/data/layout.ts`, `src/main.ts`(Scale 설정), M3 PNG 공유 품질, M5 셰이더 품질 |
| 관련 ADR | [0001 — 기술 스택](0001-tech-stack-phaser-vite-ts.md) |

## 맥락 (Context)

- 1차 타깃은 모바일 웹 세로 9:16, `Scale.FIT + autoCenter`로 스케일한다 (M0 스펙 §4).
- Phaser의 논리 해상도는 캔버스 백킹 해상도가 되어 **선명도와 필레이트 비용을 동시에** 결정하고, M3 결과 PNG 합성·M5 열화상 셰이더 품질까지 끌고 간다.

## 결정 (Decision)

논리 해상도는 **720×1280**으로 한다. `src/data/layout.ts`의 `DESIGN` 상수가 단일 출처다.

## 근거 (Rationale)

- 고DPI 폰에서 540×960은 업스케일로 가장자리가 소프트해진다. placeholder 단계 부하(계란 ≤3 × 정점 48)는 어느 해상도든 미미하다.
- M3 공유 PNG·M5 셰이더가 이 해상도를 그대로 쓰므로, 품질 기준을 처음부터 720으로 고정하는 편이 후반 재작업을 막는다.

## 대안 (Alternatives)

- **540×960** — 필레이트가 가장 가볍지만 고DPI 선명도·공유 이미지 품질 손해. 성능 문제가 실측되면 M6 성능 패스에서 재검토한다.

## 결과 (Consequences)

- 좌표·배치는 전부 `layout.ts`의 `DESIGN`·앵커 비율 기준 — 해상도 변경 시 이 파일만 수정.
- M6 성능 패스에서 폰 실측 60fps 미달 시 이 ADR을 대체(Superseded)하는 재결정이 가능하다.

---

## 관련 문서

- 미결 로그(원 항목 M0-1): [../DECISIONS.md](../DECISIONS.md) · M0 스펙: [../specs/M0-skeleton.md](../specs/M0-skeleton.md)
- 인덱스: [README.md](README.md)

최종 수정: 2026-07-07
