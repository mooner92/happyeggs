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

// 5) 서빙 → 손님 리액션 이모트 + 코인 팝업 + 지갑 HUD (ADR-0011)
{
  const page = await scene('stage=stage_01&events=off&debug=0');
  await page.mouse.click(PAN.x, PAN.y); // 깨기
  await sleep(6300); // PERFECT_WINDOW(6~8초) 진입
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await sleep(480); // 스윗스팟 → CLEAN
  await page.mouse.up();
  await sleep(700);
  // 위로 스와이프 = 서빙
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await page.mouse.move(PAN.x, PAN.y - 160, { steps: 6 });
  await page.mouse.up();
  await sleep(300);
  await shot(page, '05-serve-reaction-coins'); // 이모트 + "+N" + 코인 HUD

  // 6) 같은 런에서 RESULT → 코인 정산 라인(+N coins / wallet) + addCoins 저장 경로
  await page.mouse.click(W * 0.97, H * 0.02);
  await sleep(800);
  await shot(page, '06-result-coins');
  await page.close();
}

// 7) 드리프트 → 뒤집개 밀기 (ADR-0012) — 흘러 불룩해진 흰자를 탭해 모은다 (Q 회복은 debug HUD)
{
  const page = await scene('stage=stage_01&events=off'); // debug HUD 켬 (Q 표시)
  await page.mouse.click(PAN.x, PAN.y); // 깨기
  await sleep(4200); // 드리프트 누적 — 불룩 + 밀기 힌트
  await shot(page, '07-drift-bulge-hint');
  // 가장자리 4방향 탭탭 — 불룩 제거 (계란 근처 탭 = 밀기 라우팅)
  for (const [dx, dy] of [[70, 0], [-70, 0], [0, 55], [0, -55], [70, 0], [-70, 0]]) {
    await page.mouse.click(PAN.x + dx, PAN.y + dy);
    await sleep(140);
  }
  await sleep(400);
  await shot(page, '08-after-push-rounder');
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
