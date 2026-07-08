// 구체화 패스 QA — 주방 무대(타일/서빙바/거치판/스토브), 손 계란, 무자막 힌트 3종.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-scene';
mkdirSync(OUT, { recursive: true });
const W = 720,
  H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

async function scene(query) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}?renderer=canvas&${query}`, { waitUntil: 'networkidle' });
  await sleep(600);
  return page;
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });

// 1) stage_01 개요 — 가스 불꽃 + 크랙 힌트(팬 중앙 물결) + 왼손 계란 + 거치판(칼·방패 나란히)
{
  const page = await scene('stage=stage_01&events=off&debug=0');
  await shot(page, '01-overview-gas-crackhint');

  // 2) 깨기 → 조리 — SET(3초) 후 홀드 힌트(차오르는 파이)
  await page.mouse.click(PAN.x, PAN.y);
  await sleep(3600);
  await shot(page, '02-cooking-fliphint');

  // 3) 뒤집기(스윗스팟 홀드 ~480ms → CLEAN) → 서빙 힌트(위 화살표)
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await sleep(480);
  await page.mouse.up();
  await sleep(900);
  await shot(page, '03-flipped-servehint');
  await page.close();
}

// 4) stage_02 — 화롯불 숯(brazier) 시각 차이
{
  const page = await scene('stage=stage_02&events=off&debug=0');
  await shot(page, '04-overview-brazier');
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
