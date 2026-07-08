// M1 스테이지 클리어 QA — 손님 5명을 크랙→익힘→클린 뒤집기→서빙으로 전부 처리해 STAGE CLEAR까지.
// 게이지는 결정론적: 정밀 홀드 450ms → 값 0.75 ∈ 스윗스팟 → CLEAN. 크랙은 주문 수로 자동 캡.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/') + '?renderer=canvas';
const OUT = 'qa/shots-m1';
mkdirSync(OUT, { recursive: true });
const W = 720, H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(700);

async function serveOneCustomer() {
  // 주문 수만큼(최대 2) 크랙 — 초과 탭은 무시됨
  await page.mouse.click(PAN.x - 40, PAN.y);
  await sleep(200);
  await page.mouse.click(PAN.x + 40, PAN.y);
  await sleep(4500); // SET~ 까지 익힘
  // 정밀 홀드 → 클린 뒤집기 (중간 스크린샷 없음)
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await sleep(450);
  await page.mouse.up();
  await sleep(700); // 착지
  // 위로 스와이프 → 서빙
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await page.mouse.move(PAN.x, PAN.y - 220, { steps: 8 });
  await page.mouse.up();
  await sleep(400);
}

for (let i = 0; i < 5; i++) {
  await serveOneCustomer();
  if (i === 0) await shot('stage-01-after-c1');
  if (i === 2) await shot('stage-02-after-c3');
}
await sleep(500);
await shot('stage-03-result'); // 전원 서빙 → STAGE CLEAR

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
