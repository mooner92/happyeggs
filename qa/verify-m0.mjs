// M0 시각·조작 QA 하네스 (Playwright) — 폰 실기 육안 확인을 자동화한다.
// 캔버스 게임이라 상태를 직접 읽는 대신 상호작용을 구동하고 시점별 스크린샷을 남긴다.
// 콘솔 에러도 수집한다. 사용: node qa/verify-m0.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// 헤드리스 chromium은 이 환경에서 WebGL 컨텍스트를 잃으므로 CANVAS 렌더러를 강제한다.
// M0는 전부 Graphics 도형이라 시각 결과가 동일하다(프로덕션 기본은 AUTO/WebGL 유지).
const BASE = process.argv[2] ?? 'http://localhost:5173/';
const withCanvas = (u) => u.replace(/\/?(\?.*)?$/, (m, q) => '/' + (q ? q + '&' : '?') + 'renderer=canvas');
const URL = withCanvas(BASE);
const OUT = 'qa/shots';
mkdirSync(OUT, { recursive: true });

// 논리 해상도와 동일한 뷰포트 → FIT 스케일 1:1, 논리 좌표 = 화면 좌표
const W = 720;
const H = 1280;
// 팬 중심(ANCHOR 0.5, 0.58)과 크랙 지점 3곳
const PAN = { x: W * 0.5, y: H * 0.58 };
const CRACKS = [
  { x: PAN.x, y: PAN.y },
  { x: PAN.x - 70, y: PAN.y - 60 },
  { x: PAN.x + 75, y: PAN.y + 55 },
];
const RESULT_BTN = { x: W * 0.97 - 40, y: H * 0.015 + 20 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
});

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(600); // Boot→Preload→Game 전환
await shot('01-initial');

// 계란 3개 깨기 (탭)
for (const c of CRACKS) {
  await page.mouse.click(c.x, c.y);
  await sleep(250);
}
await shot('02-cracked-3');

// 익힘 진행 — SET_AT 3s ... SMOKE_AT 13s (실시간). 시점별 색 변화 확인
const marks = [
  [2500, '03-set'], // ~2.5s: RAW→SET 근처
  [3500, '04-perfect'], // ~6s: PERFECT
  [3000, '05-overdone'], // ~9s: OVERDONE
  [3000, '06-burnt'], // ~12s: BURNT
  [3500, '07-smoke'], // ~15.5s: SMOKE + 유예
];
let t = 0;
for (const [dwell, name] of marks) {
  await sleep(dwell);
  t += dwell;
  await shot(name);
}

// RESULT 스텁 진입
await page.mouse.click(RESULT_BTN.x, RESULT_BTN.y);
await sleep(400);
await shot('08-result');

// 재시작 → Game 복귀 (씬 라이프사이클/리스너 누수 육안 확인)
await page.mouse.click(PAN.x, PAN.y);
await sleep(400);
await page.mouse.click(PAN.x + 40, PAN.y + 30);
await sleep(300);
await shot('09-restart-cracked');

// ?debug=0 → HUD 꺼짐 확인
await page.goto('http://localhost:5173/?renderer=canvas&debug=0', { waitUntil: 'networkidle' });
await sleep(600);
await page.mouse.click(PAN.x, PAN.y);
await sleep(300);
await shot('10-debug-off');

await browser.close();

console.log(JSON.stringify({ url: URL, elapsedMs: t, consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
