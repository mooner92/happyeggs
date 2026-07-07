# ADR 0008 — balance.ts의 범위: 게임플레이 튜닝 수치만

> GDD §0 "밸런스 수치는 전부 `src/data/balance.ts` 한 파일" 규약의 해석 범위를 기록한다. [../DECISIONS.md](../DECISIONS.md)의 **M0-5** 승격분이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0008 |
| 상태 | **채택(Accepted)** |
| 기록일 | 2026-07-07 |
| 결정 주체 | 디렉터 (M0 스펙 승인 시 기본안 일괄 채택) |
| 영향 범위 | `src/data/` 4분할 (balance / palette / layout / assets) |
| 관련 ADR | [0003 — SDD 문서 체계](0003-sdd-document-structure.md) |

## 맥락 (Context)

- GDD §0: "밸런스 수치(시간, 계수, 판정 윈도우, 감점량)는 전부 `src/data/balance.ts` 한 파일에 상수로. 매직넘버 인라인 금지."
- 색(placeholder 팔레트·익힘 상태별 색)과 좌표(논리 해상도·배치 앵커)도 상수인데, 문면대로 전부 한 파일에 넣으면 M5 스킨(팔레트 교체)·열화상(팔레트 스왑 셰이더) 때 게임플레이 수치와 표현 값이 뒤엉킨다.

## 결정 (Decision)

`balance.ts`에는 **게임플레이 튜닝 수치**(GDD §0이 열거한 시간·계수·판정 윈도우·감점량 부류)만 둔다. **색은 `palette.ts`, 좌표·해상도는 `layout.ts`, 에셋 키는 `assets.ts`** 로 분리한다. "매직넘버 인라인 금지"는 네 파일 전체에 동일하게 적용한다.

## 근거 (Rationale)

- GDD §0의 의도는 "튜닝할 숫자를 찾으러 코드를 뒤지지 않게 하라"다 — 분리는 그 의도를 강화하지 훼손하지 않는다.
- M5 스킨/열화상은 palette만, DECISION-05(가로 확장)는 layout만 갈아끼우면 된다.

## 대안 (Alternatives)

- **문면대로 한 파일** — 규약 준수는 명확하나 파일이 성격이 다른 상수의 잡탕이 되고, M5에서 분리 리팩터링이 강제된다.

## 결과 (Consequences)

- 게임플레이 수치의 단일 출처는 여전히 balance.ts 하나 — GDD 문면과의 차이는 이 ADR이 근거다.
- 어떤 상수가 "튜닝 수치인가 표현 값인가" 애매하면 balance.ts에 둔다(보수적 기본).

---

## 관련 문서

- 미결 로그(원 항목 M0-5): [../DECISIONS.md](../DECISIONS.md) · 데이터 파일 4종: [../02-architecture.md](../02-architecture.md) §6
- 인덱스: [README.md](README.md)

최종 수정: 2026-07-07
