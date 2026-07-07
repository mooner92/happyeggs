# CLAUDE.md — EGG FLIP (가제)

> 이 파일은 Claude Code가 매 세션 자동으로 읽는 프로젝트 컨텍스트다. 작업 전 반드시 숙지한다.
> 상세 스펙은 [GDD.md](GDD.md)(SSOT), 진행 상황은 [WORKPLAN.md](WORKPLAN.md), 설계 문서는 [docs/](docs/README.md) 참조.

## 프로젝트 한 줄 정의

1인칭 계란후라이 아케이드 게임. 손님 주문대로 계란을 깨서 굽고, 낚시 캐스팅식 파워 게이지로 팬을 뒤집고,
사방에서 난입하는 방해꾼을 몇 초 안에 올바른 입력으로 처리하면서, 최대한 완벽한 원에 가까운 후라이를 만든다
(원형도 기반 소수점 3자리 채점). **Phaser 3 + TypeScript(strict) + Vite**, 1차 타깃은 모바일 웹 세로 9:16.

## 역할

- **너(Claude Code) = 리드 게임 프로그래머.** 스펙 작성·구현·테스트·문서 동기화를 담당한다.
- **디렉터 = 기획.** 게임 개발 방법론에 익숙하지 않다. 전문 용어는 써도 되지만,
  **선택지가 갈리는 지점은 트레이드오프를 1~2줄로 요약해서 질문한다.**

## ⛔ 절대 규칙 (GDD §0 이관 — 어기면 프로젝트가 위험해진다)

1. **마일스톤(GDD §13) 순서 엄수.** 각 마일스톤 시작 시: 스펙 제시 → 디렉터 승인 → 구현 →
   실행/테스트 방법 보고 → **정지하고 리뷰 대기**. 마일스톤 건너뛰기·병합 금지.
2. **임의 결정 금지.** GDD와 충돌하거나 문서에 없는 판단이 필요하면
   [docs/DECISIONS.md](docs/DECISIONS.md)에 [DECISION] 항목을 추가한 뒤 디렉터에게 질문한다.
3. **밸런스 수치(시간·계수·판정 윈도우·감점량)는 전부 `src/data/balance.ts` 한 파일에 상수로.**
   매직넘버 인라인 금지. (색은 palette.ts·좌표는 layout.ts 분리 — [ADR-0008](docs/adr/0008-balance-file-scope.md))
4. **유닛테스트는 순수 로직에만**(채점, 익힘 모델, 뒤집기 판정, 이벤트 스케줄러). 렌더링 테스트 금지.
5. **성능 예산 준수.** update 루프 내 per-frame 객체 할당 금지, 적/파티클/말풍선은 오브젝트 풀링,
   입력은 `pointerdown` 기준(click 지연 금지), 미드레인지 안드로이드 크롬 60fps, 초기 번들 < 3MB.

## SDD 작업 흐름 (모든 마일스톤에서 반복)

| 단계 | 내용 | 스펙 상태 |
|---|---|---|
| ① 스펙 작성 | `docs/specs/M{n}-*.md` — 범위·파일 계획·테스트·인수 조건·미결 [DECISION] | Proposed |
| ② 디렉터 승인 | 미결 결정 확정 → `docs/adr/`로 승격 | Approved |
| ③ 구현 | 브랜치 `feat/m{n}-*`, 작은 conventional commits | Implemented |
| ④ 검증 | 스펙의 인수 조건 체크리스트 + Vitest | Verified |
| ⑤ 문서 동기화 | 스펙 as-built 갱신, WORKPLAN.md 체크, README.md 상태 갱신 → **정지·리뷰 대기** | — |

프로세스 상세와 스펙 템플릿은 [docs/specs/README.md](docs/specs/README.md) 참조.

## 레포 구조

```
happyeggs/
├─ README.md            # 프로젝트 진입점 · 현재 상태
├─ CLAUDE.md            # (이 파일) 매 세션 작업 규칙
├─ WORKPLAN.md          # M0~M7 마일스톤 체크리스트 (DoD)
├─ GDD.md               # ★ 게임 디자인 문서 — 단일 진실 소스(SSOT)
├─ docs/
│  ├─ README.md         # 문서 인덱스 + 표기 규약
│  ├─ 01-overview.md ~ 05-conventions.md   # 개요 · 아키텍처 · 게임 시스템 · 테스트 · 규약
│  ├─ DECISIONS.md      # 미결 [DECISION] 로그 (확정 시 adr/로 승격)
│  ├─ adr/              # 확정 결정 기록 (ADR)
│  └─ specs/            # 마일스톤 스펙 (SDD) — M0-skeleton.md (상태: Approved)
└─ src/                 # M0 구현 — feat/m0-skeleton 브랜치에서 작성
   ├─ scenes/           # Boot / Preload / Game / Result
   ├─ systems/          # 순수 TS 모델 — Phaser import 금지, Vitest 대상
   ├─ data/             # balance.ts(★ 밸런스 수치 전부) · assets · palette · layout
   └─ ui/               # 뷰(팬/손/계란) + 디버그 HUD
```

- **순수 모델/뷰 분리**가 핵심 아키텍처 원칙: `src/systems/`·`src/data/`는 Phaser를 import하지 않는다.
  상세는 [docs/02-architecture.md](docs/02-architecture.md) 참조.

## 스택 & 규약

- 스택(고정 — 변경 제안 금지): **Phaser 3 최신 안정판 + TypeScript(strict) + Vite**. 물리엔진 미사용(자체 간이 시뮬).
- 상태 관리: 씬 로컬 상태 + 자체 경량 EventBus. **외부 상태관리 라이브러리 금지.**
- 테스트: Vitest. 린트: eslint + prettier 기본 설정.
- 언어: **코드/식별자는 영어, 주석과 문서는 한국어.**
- 커밋: conventional commits(`feat:` `fix:` `refactor:` `docs:` `chore:`) — 작게 나눈다.
- 브랜치: 문서는 `main`, 구현은 `feat/m{n}-*` (예: `feat/m0-skeleton`).

## 실행 커맨드

아래 커맨드는 M0 스캐폴드 커밋(`feat/m0-skeleton` 브랜치) 이후 동작한다. M0 스펙은
[docs/specs/M0-skeleton.md](docs/specs/M0-skeleton.md) (상태: Approved).

| 커맨드 | 용도 | 상태 |
|---|---|---|
| `npm run dev` | Vite 개발 서버 (`--host` 포함 — 동일 네트워크 폰 테스트) | ✅ 동작 |
| `npm run build` | 타입체크 + 정적 빌드 (Vercel / GH Pages / itch.io 겨냥) | ✅ 동작 |
| `npm run test` | Vitest — 순수 로직만 | ✅ 동작 |
| `npm run lint` | eslint (+ `npm run format` — prettier) | ✅ 동작 |

## 관련 문서

- [GDD.md](GDD.md) — SSOT. 게임 규칙·수치·마일스톤의 근거는 전부 여기
- [WORKPLAN.md](WORKPLAN.md) — M0~M7 체크리스트와 DoD
- [docs/README.md](docs/README.md) — 문서 인덱스
- [docs/DECISIONS.md](docs/DECISIONS.md) — [DECISION] 로그: DECISION-01~07 미결 · M0-1~5 확정(ADR-0004~0008)

---

최종 수정: 2026-07-07
