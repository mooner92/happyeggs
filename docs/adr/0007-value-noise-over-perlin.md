# ADR 0007 — 블롭 노이즈는 자체 1D 밸류 노이즈로 구현

> GDD §6.1의 "정점별 Perlin 노이즈" 표기의 구현 방식을 기록한다. [../DECISIONS.md](../DECISIONS.md)의 **M0-4** 승격분이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0007 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | 디렉터 (M0 스펙 승인 시 기본안 일괄 채택) |
| 영향 범위 | `src/systems/noise.ts`, `src/systems/EggBlobModel.ts` |
| 관련 ADR | [0001 — 기술 스택](0001-tech-stack-phaser-vite-ts.md) |

## 맥락 (Context)

- GDD §6.1은 블롭 정점 퍼짐에 "정점별 Perlin 노이즈 + 이웃 정점 스무딩"을 지정한다. 목적은 **자연스러운 비정형 원**이지 특정 알고리즘이 아니다.
- 번들 예산(<3MB)과 테스트 결정론(시드 제어) 요구가 있다 (GDD §2, M0 스펙 설계 원칙).

## 결정 (Decision)

정식 Perlin(그래디언트 노이즈) 대신 **시드 기반 자체 1D 밸류 노이즈**(정수 격자 해시 + 스무스 보간, 출력 [-1,1])를 구현해 쓴다. 외부 노이즈 라이브러리는 도입하지 않는다.

## 근거 (Rationale)

- 반경 48개 정점의 저주파 요동이라는 용도에서 밸류 노이즈와 Perlin의 시각 차이는 식별 불가 수준이다.
- 의존성 0(공급망·번들 비용 없음), 수십 줄 구현, 시드 완전 제어 — 동일 시드 = 동일 블롭이 테스트 계약이 된다.

## 대안 (Alternatives)

- **정식 Perlin/Simplex 직접 구현** — 품질 이득 없이 구현·검증 비용만 증가.
- **라이브러리(simplex-noise 등)** — 시드 제어는 되지만 번들·의존성 비용. placeholder 단계에 과함.

## 결과 (Consequences)

- `createNoise1D(seed)` 인터페이스만 유지하면 비주얼이 부족할 때 M6에서 알고리즘 교체 가능(호출부 무수정).
- 문서·주석에서는 GDD 원문 표기("Perlin")와의 차이를 이 ADR로 링크해 설명한다.

---

## 관련 문서

- 미결 로그(원 항목 M0-4): [../DECISIONS.md](../DECISIONS.md) · 블롭 시스템: [../03-game-systems.md](../03-game-systems.md) §2
- 인덱스: [README.md](README.md)

최종 수정: 2026-07-07
