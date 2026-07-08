# QA — 시각·조작 검증 (Playwright)

> GDD §13 M0 인수 조건의 "폰 브라우저 육안 확인"을 자동화한다. 캔버스 게임이라 상태를 직접 읽는 대신
> Playwright로 조작을 구동하고 시점별 스크린샷을 남겨, 렌더·색 변화·씬 전환·UX를 눈으로 검증한다.

## 실행

```bash
npm run dev          # 별도 터미널에서 (5173)
npm run qa           # = node qa/verify-m0.mjs → qa/shots/*.png 생성, 콘솔 에러 수집
```

산출물 `qa/shots/`는 gitignore(생성물)다. 하네스 `verify-m0.mjs`만 커밋한다.

## 렌더러 주의 — `?renderer=canvas`

이 헤드리스 환경의 chromium은 WebGL 컨텍스트를 잃어 렌더러가 꺼진다(`WebGL Context lost. Renderer disabled`).
M0는 전부 `Graphics` 도형이라 CANVAS 렌더러로 그려도 **시각 결과가 동일**하므로, 하네스는 `?renderer=canvas`로
CANVAS를 강제한다([`src/main.ts`](../src/main.ts)). **프로덕션 기본은 AUTO(WebGL 우선)** 이며 이 파라미터는 QA 전용이다.
실기 폰은 WebGL로 동작한다.

## 검증 시나리오 (`verify-m0.mjs`)

| 스크린샷 | 확인 항목 |
|---|---|
| 01-initial | Boot→Preload→Game 전환, 팬·양손·카운터·HUD·RESULT 버튼 렌더 |
| 02-cracked-3 | 팬 탭 → 계란 3개 생성(MAX_EGGS), 블롭·노른자 렌더 |
| 03~07 (set→smoke) | 익힘 색 변화 RAW→SET→OVERDONE→BURNT→SMOKE, SMOKE 시 HUD 빨간 경고 |
| 08-result | RESULT 버튼 → Result 스텁, ASCII 텍스트 |
| 09-restart | Result 탭 → Game 복귀(씬 라이프사이클·리스너 누수 없음) |
| 10-debug-off | `?debug=0` → HUD 숨김 |

## 발견 → 개선 이력 (2026-07-08)

Playwright 스크린샷 육안 검토로 찾은 UX 결함 3건과 개선:

1. **결과 화면 한글이 두부(□)로 깨짐** — Result 스텁의 "탭하면 재시작"이 이 환경 폰트 미탑재로 `□□□`로 렌더.
   기기 한글 폰트에 의존하면 어느 기기에서든 깨질 수 있다.
   → **개선**: M0 placeholder UI는 ASCII만 사용(`tap to restart`). 한글 폰트 번들링은 폴리시(M6)·GDD §14 소관.
   근거: 폰트 견고성 + GDD §15 "UI 텍스트 최소화".

2. **뒤집개(스패출러)가 팬 위에 뜬 어두운 사각형으로 읽힘** — 날이 팬과 같은 어두운 색이라 손에 든 도구로 안 보이고
   화면 위 임의 버튼처럼 보였다.
   → **개선**: 날을 밝은 금속색(`SPATULA_STYLE.blade`) + 테두리로, 손잡이를 나무색으로 바꾸고 크기를 키워 팬 위로 걸치게 함.
   근거: GDD §4 "1인칭 양손(왼손 팬 손잡이 / 오른손 뒤집개)"이 명확히 읽혀야 한다.

3. **팬이 허공에 떠 바닥이 없음** — 팬·양손이 어두운 배경에 떠 있어 "주방"이라는 공간감이 없었다.
   → **개선**: 주방 카운터 placeholder 밴드(`CounterView`)를 팬 뒤에 깔아 바닥을 줌. 렌더 깊이(`DEPTH`)를
   카운터 < 팬 < 계란 < 손 순으로 명시.
   근거: GDD §4 화면 구성의 [주방 카운터] 반영, 팬이 놓인 공간감 확보. 손님 대기열·원경은 M1/M4 소관이라 미포함.

> [!NOTE]
> 위 3건은 렌더/표현 개선(placeholder art, GDD §14)이며 게임 로직·수치는 건드리지 않았다.
> 순수 로직 회귀는 `npm run test`(Vitest)가 잡는다.
