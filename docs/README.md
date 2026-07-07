# 📚 설계 문서 인덱스 — EGG FLIP (가제)

> `docs/`는 이 프로젝트의 **엔지니어링 설계 문서 묶음**입니다. "왜 이렇게 만드는가"와 "어떻게 만들고 검증하는가"를 한곳에 모았습니다.
> 시스템 한 줄 정의: 손님 주문대로 계란을 깨서 굽고, 낚시 캐스팅식 파워 게이지로 팬을 뒤집고, 난입하는 방해꾼을 올바른 입력으로 처리하며 **최대한 완벽한 원**에 가까운 후라이를 만드는 1인칭 아케이드 게임 (Phaser 3 + TypeScript strict + Vite, 모바일 웹 세로 9:16 1차 타깃).

---

## 🧭 GDD(기획 SSOT)와 docs(엔지니어링 설계)의 관계

- **[../GDD.md](../GDD.md)가 단일 진실 소스(SSOT)입니다.** 게임 규칙·수치·마일스톤 범위는 전부 GDD가 정합니다.
- `docs/`는 GDD를 **엔지니어링 관점으로 전개**한 문서입니다 — 아키텍처, 시스템 설계, 테스트 전략, 규약, 스펙.
- **값·규칙이 충돌하면 GDD가 이깁니다.** docs 쪽을 GDD에 맞춰 고칩니다. GDD 자체의 변경은 디렉터만 합니다.
- GDD에 없는 판단이 필요하면 임의로 정하지 않고 [DECISIONS.md](DECISIONS.md)에 [DECISION] 항목으로 올려 디렉터 확인을 받습니다. 확정된 결정은 [adr/](adr/README.md)로 승격합니다.

> [!NOTE]
> 현재 상태(2026-07-07): M0 스펙([specs/M0-skeleton.md](specs/M0-skeleton.md)) **Approved**(M0-1~5 기본안 채택) — `feat/m0-skeleton` 브랜치에서 구현 진행 중. 실행 명령(`npm run dev` 등)은 스캐폴드 커밋부터 동작합니다.

---

## 📄 문서 목록

| # | 제목 | 한 줄 설명 | 링크 |
|---|------|-----------|------|
| 01 | 개요 (Overview) | 컨셉·톤·타깃·성능 예산·코어 루프·비목표 | [01-overview.md](01-overview.md) |
| 02 | 아키텍처 (Architecture) | 스택 · 씬 구조 · 순수 모델/뷰 분리 · EventBus · 데이터 주도 설계 | [02-architecture.md](02-architecture.md) |
| 03 | 게임 시스템 (Game Systems) | 계란·익힘 FSM·뒤집기·채점·이벤트 시스템의 엔지니어링 설계 | [03-game-systems.md](03-game-systems.md) |
| 04 | 테스트 (Testing) | Vitest 전략 — 순수 로직만, 렌더링 테스트 금지 | [04-testing.md](04-testing.md) |
| 05 | 규약 (Conventions) | 개발 규약·브랜치·conventional commits·기여 가이드 | [05-conventions.md](05-conventions.md) |
| — | 결정 로그 (Decisions) | 미결 [DECISION] 목록 — GDD §16 + M0-1~5 | [DECISIONS.md](DECISIONS.md) |
| — | ADR 인덱스 | 확정된 아키텍처 결정 기록 (0001~0008) | [adr/README.md](adr/README.md) |
| — | 스펙 인덱스 (Specs) | SDD 프로세스·스펙 템플릿·마일스톤별 스펙 | [specs/README.md](specs/README.md) |
| — | M0 스펙 | M0(뼈대) 파일 단위 구현 스펙 — 상태: **Approved** | [specs/M0-skeleton.md](specs/M0-skeleton.md) |

---

## 🗺️ 독자별 추천 읽기 경로

### 🎬 디렉터 (기획·승인을 한다)

무엇이 만들어지는지 → 시스템이 기획을 어떻게 구현하는지 → 지금 승인 대기 중인 것 순서로 읽습니다.

1. [01-overview.md](01-overview.md) — 컨셉·성능 예산·코어 루프
2. [03-game-systems.md](03-game-systems.md) — 게임 시스템의 엔지니어링 해석
3. [specs/README.md](specs/README.md) → [specs/M0-skeleton.md](specs/M0-skeleton.md) — 승인된(Approved) M0 스펙

> [!TIP]
> M0 스펙과 M0-1~5는 2026-07-07 승인·확정되었습니다. 디렉터에게 남은 미결은 [DECISIONS.md](DECISIONS.md)의 **DECISION-01~07**(주로 M1·M4에서 필요)입니다.

### 👩‍💻 개발자 (구현·테스트를 한다)

구조 → 시스템 → 검증 → 규약 → 설계 의도 순서로 읽습니다.

1. [02-architecture.md](02-architecture.md) — 스택·씬·모델/뷰 분리·EventBus
2. [03-game-systems.md](03-game-systems.md) — 각 시스템 설계
3. [04-testing.md](04-testing.md) — 테스트 전략
4. [05-conventions.md](05-conventions.md) — 브랜치·커밋·코드 규약
5. [adr/README.md](adr/README.md) — 왜 이렇게 결정했는가

### 🐣 처음 온 사람

[../README.md](../README.md)(프로젝트 진입점)부터 시작해 [../GDD.md](../GDD.md)(기획 SSOT) → 이 인덱스로 돌아오는 것을 권합니다. Claude Code 작업 규칙은 [../CLAUDE.md](../CLAUDE.md), 마일스톤 체크리스트는 [../WORKPLAN.md](../WORKPLAN.md)에 있습니다.

---

## ✒️ 표기 규약

이 폴더의 모든 문서는 GitHub Flavored Markdown으로 작성하고 아래 규약을 따릅니다.

### 링크 규약

| 대상 | 표기 | 예시 |
|------|------|------|
| `docs/` 내부 문서 (같은 폴더) | 파일명만 (상대링크) | `[02-architecture.md](02-architecture.md)` |
| `docs/`에서 `adr/`·`specs/` | 하위 경로 | `[adr/README.md](adr/README.md)` |
| `adr/`·`specs/`에서 `docs/` 문서 | `../<파일>` | `../02-architecture.md` |
| `adr/`·`specs/`에서 루트 파일 | `../../<파일>` | `../../GDD.md` |
| `docs/`에서 루트 파일 | `../<파일>` | `../README.md`, `../GDD.md`, `../WORKPLAN.md` |

### 다이어그램 (mermaid)

그림이 이해를 돕는 곳에만 정보 문자열이 `mermaid`인 펜스 코드블록을 씁니다. `flowchart`(구조·흐름)와 `gantt`(일정)를 주로 사용하며, 장식용 다이어그램은 만들지 않습니다.

### 콜아웃

인용블록 콜아웃은 **GitHub이 렌더하는 GFM 알림 문법**(대문자, 마커 단독 라인)을 쓰고, **절제해서** 사용합니다. 제목이 필요하면 마커 다음 줄에 굵게 씁니다.

> [!NOTE]
> 보조 설명·맥락.

> [!TIP]
> 권장 사항·요령.

> [!WARNING]
> 주의·위험·하지 말 것.

> [!IMPORTANT]
> **확인 필요: <무엇>** — 미확정 사실 전용. GDD·스펙에 없는 수치나 정해지지 않은 사실을 모를 때 추측 대신 사용합니다.

`[!CAUTION]`은 예비로 남겨두고, 소문자·비표준 마커(`[!note]`, `[!todo]` 등)는 GitHub에서 일반 인용문으로 렌더되므로 쓰지 않습니다.

### 기타 표기

- **코드블록**에는 언어 힌트를 붙입니다: `ts`, `jsonc`, `bash`.
- **이모지**는 섹션 강조용으로만 최소한으로 씁니다.
- **일관 표기:** 프로젝트명은 **EGG FLIP (가제)**, SSOT는 GDD.md, 아키텍처 원칙은 "순수 모델/뷰 분리", 마일스톤은 M0(뼈대)~M7, 스펙 상태는 **Proposed / Approved / Implemented / Verified**.

---

## ⛔ 문서가 지키는 규칙

1. **미결 [DECISION]을 확정처럼 쓰지 않는다.** 미결/확정 현황의 단일 출처는 [DECISIONS.md](DECISIONS.md)다. 미결 항목을 본문에서 언급할 때는 반드시 `[DECISION-XX]` / `[M0-X]` 태그와 "기본안"임을 밝힌다.
2. **GDD 수치를 왜곡하지 않는다.** 밸런스·판정·감점 수치는 GDD와 승인된 스펙에 있는 값만 인용한다. 모르면 `[!IMPORTANT]`(확인 필요) 콜아웃을 둔다.
3. **스펙 상태를 명시한다.** 모든 스펙 문서는 머리말에 Proposed / Approved / Implemented / Verified 중 하나를 표기하고, 상태 전이는 SDD 루프([specs/README.md](specs/README.md))를 따른다.
4. **실행 명령은 실제로 동작하는 것만 현재형으로 쓴다.** 아직 없는 기능·명령은 "예정"과 도입 마일스톤을 함께 표기한다.

---

## 관련 문서

- 🏠 **프로젝트 루트 README:** [../README.md](../README.md)
- 🎮 **기획 SSOT:** [../GDD.md](../GDD.md)
- 🤖 **Claude Code 작업 규칙:** [../CLAUDE.md](../CLAUDE.md)
- 🗺️ **마일스톤 체크리스트:** [../WORKPLAN.md](../WORKPLAN.md)
- ▶️ **다음 문서:** [01-overview.md](01-overview.md)

---

최종 수정: 2026-07-07
