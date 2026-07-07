# ADR 0003 — SDD 문서 체계 채택 (KEIAdminSuperv 구조 준용)

> 2026-07-07 디렉터 지시로, 사내 레포 KEIAdminSuperv의 문서 체계를 본떠 **SDD(Spec Driven Development) 문서 구조**를 채택한 기록이다.
> [GDD](../../GDD.md) §0 문면(루트 `ARCHITECTURE.md`, ADR-lite `DECISIONS.md`)과 실제 문서 구조가 다른 **유일한 근거**가 이 ADR이다.

| 항목 | 내용 |
|---|---|
| 번호 | ADR-0003 |
| 상태 | **채택(Accepted)** |
| 결정일 | 2026-07-07 |
| 결정 주체 | 디렉터 지시 |
| 영향 범위 | 레포 루트 문서 · `docs/` 전체 |
| 관련 문서 | [../../GDD.md](../../GDD.md) §0 · [../specs/README.md](../specs/README.md) |

## 맥락 (Context)

- GDD §0은 유지 문서로 루트 `ARCHITECTURE.md`(시스템 구조), `docs/DECISIONS.md`(미결/결정 로그, ADR-lite), 초기 `CLAUDE.md` 생성을 지정했다.
- 디렉터는 동일 구조의 사내 레포(KEIAdminSuperv — README/CLAUDE/WORKPLAN + docs/ 번호 문서 + adr/ + specs/)를 운영한 경험이 있고, 그 체계의 탐색성·리뷰 효율이 검증되어 있다.
- 이 프로젝트는 마일스톤마다 "파일 단위 계획 제시 → 승인 → 구현 → 정지·리뷰 대기"를 반복한다 (GDD §0·§13) — 스펙 문서가 프로세스의 중심이 되는 SDD와 자연스럽게 맞는다.

## 결정 (Decision)

2026-07-07 디렉터 지시로 다음 문서 체계를 채택한다.

- 루트: `README.md`(진입점) · `CLAUDE.md`(작업 규칙) · `WORKPLAN.md`(M0~M7 체크리스트) · `GDD.md`(SSOT — **무수정 보존**)
- `docs/`: 번호 문서(01-overview ~ 05-conventions) · `DECISIONS.md`(미결 로그) · `adr/`(확정 기록) · `specs/`(마일스톤 스펙, 상태 Proposed/Approved/Implemented/Verified)

GDD §0 문면과의 매핑:

| GDD §0 지정 | 실제 구조 | 비고 |
|---|---|---|
| 루트 `ARCHITECTURE.md` | [../02-architecture.md](../02-architecture.md) | docs/ 번호 문서로 이동 |
| `docs/DECISIONS.md` (ADR-lite 미결/결정 로그) | [../DECISIONS.md](../DECISIONS.md)(미결) + [docs/adr/](README.md)(확정)로 **이원화** | 미결은 유동 문서, 확정은 불변 기록 |
| 초기 `CLAUDE.md` 생성 | 루트 [CLAUDE.md](../../CLAUDE.md) | 동일 (위치 변경 없음) |

## 근거 (Rationale)

- **검증된 구조의 재사용**: 디렉터가 운영 중인 레포와 동형이라 리뷰어(디렉터)의 인지 비용이 최소화된다.
- **미결/확정 이원화**: 유동적인 미결 로그와 불변 ADR을 한 파일에 섞으면 "확정된 것처럼 보이는 미결"이 생긴다. 분리로 상태 오독을 구조적으로 막는다.
- **스펙 중심(SDD)**: GDD §13의 "계획 → 승인 → 구현 → 정지" 루프를 스펙 상태 수명주기(Proposed→Approved→Implemented→Verified)로 형식화해 승인 게이트를 문서로 남긴다.

## 대안 (Alternatives)

| 대안 | 채택하지 않은 이유 |
|---|---|
| GDD §0 문면 그대로 (루트 `ARCHITECTURE.md` + 단일 `DECISIONS.md`) | 문서가 늘수록 루트 산개 + 미결/확정 혼재. 마일스톤 8개(M0~M7)의 스펙을 담을 자리가 없음 |
| 문서 최소화 (README 하나) | 승인 게이트의 근거 문서가 없어 GDD §0 "임의 결정 금지" 규약을 운용할 수 없음 |

## 결과 (Consequences)

- GDD §0 문면과 실제 문서 구조의 차이는 **이 ADR이 유일한 근거**다. `GDD.md` 본문은 SSOT로서 수정하지 않는다.
- 모든 문서는 표기 규약([../README.md](../README.md) 참조)과 "관련 문서" 절 + 최종 수정일 규칙을 따르고, 스펙 수명주기는 [../specs/README.md](../specs/README.md)가 정의한다.
- 감수할 점: 문서 수가 많아 동기화 비용이 생긴다 — SDD 루프 ⑤(문서 동기화)를 마일스톤 종료 조건에 포함해 상쇄한다.

---

## 관련 문서

- ADR 인덱스: [README.md](README.md) · SSOT: [../../GDD.md](../../GDD.md) §0
- 문서 인덱스: [../README.md](../README.md) · 미결 로그: [../DECISIONS.md](../DECISIONS.md) · SDD 프로세스: [../specs/README.md](../specs/README.md)
- 이전 ADR: [0002-custom-eventbus-no-state-lib.md](0002-custom-eventbus-no-state-lib.md)

최종 수정: 2026-07-07
