// M3 스테이지 QA — 스테이지 로드→클리어→결과(접시·별점·카운트업)→PNG 다운로드 검증.
// 방해꾼(거미=드래그, 강도=더블탭)에도 대응하며 손님을 처리한다.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-m3';
mkdirSync(OUT, { recursive: true });
const W = 720, H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  acceptDownloads: true,
});
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(`${BASE}?renderer=canvas&stage=stage_01&events=off`, { waitUntil: 'networkidle' });
await sleep(600);

async function serveOne() {
  await page.mouse.click(PAN.x - 40, PAN.y);
  await sleep(180);
  await page.mouse.click(PAN.x + 40, PAN.y);
  await sleep(4200); // 익힘
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await sleep(450); // 클린 뒤집기
  await page.mouse.up();
  await sleep(650);
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await page.mouse.move(PAN.x, PAN.y - 220, { steps: 8 });
  await page.mouse.up();
  await sleep(350);
}

for (let i = 0; i < 5; i++) await serveOne();
await sleep(600);
await shot('01-result'); // STAGE CLEAR + 접시 + 별점 + 카운트업

// PNG 공유(다운로드 폴백) 검증 — SHARE 버튼 탭
const cx = W / 2;
const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.mouse.click(cx - 130, H * 0.88); // SHARE
const download = await dl;
const dlName = download ? download.suggestedFilename() : null;
await sleep(300);
await shot('02-after-share');

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors, downloadFilename: dlName }, null, 2));
if (errors.length) process.exitCode = 1;
