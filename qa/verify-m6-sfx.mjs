// M6 QA — 절차적 SFX 훅 발화(window.__sfxLog) + 게임필 연출(껍데기 파편·서빙 비행).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-m6';
mkdirSync(OUT, { recursive: true });
const W = 720,
  H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];
const missing = [];

async function scene(query) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}?renderer=canvas&${query}`, { waitUntil: 'networkidle' });
  await sleep(700);
  return page;
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });
// 콜백은 브라우저 컨텍스트에서 실행됨
// eslint-disable-next-line no-undef
const sfxLog = (page) => page.evaluate(() => window.__sfxLog ?? []);
const expectSfx = async (page, keys, label) => {
  const log = await sfxLog(page);
  for (const k of keys) if (!log.includes(k)) missing.push(`${label}: ${k} (log: ${log.join(',')})`);
};

// 1) 코어 루프 사운드 — crack → push → flip/land → serve/coin (+연출 스크린샷)
{
  const page = await scene('stage=stage_01&events=off&debug=0');
  await page.mouse.click(PAN.x, PAN.y); // 깨기
  await sleep(160);
  await shot(page, '01-shell-shards'); // 껍데기 파편
  await sleep(2200);
  await page.mouse.click(PAN.x + 70, PAN.y); // 가장자리 = 밀기
  await sleep(3800); // PERFECT_WINDOW 진입
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await sleep(480);
  await page.mouse.up(); // 스윗스팟 → CLEAN
  await sleep(700);
  await page.mouse.move(PAN.x, PAN.y);
  await page.mouse.down();
  await page.mouse.move(PAN.x, PAN.y - 160, { steps: 6 });
  await page.mouse.up(); // 서빙
  await sleep(200);
  await shot(page, '02-serve-flight'); // 후라이 비행 중
  await expectSfx(
    page,
    ['crack', 'push', 'flip_whoosh', 'land_clean', 'serve', 'coin'],
    'core-loop',
  );
  await page.close();
}

// 2) 이벤트 사운드 — telegraph → 성공(거미 절단)
{
  const page = await scene('stage=stage_01&spawn=ninja_spider&events=off&debug=0');
  await page.mouse.click(PAN.x, PAN.y); // 조리 컨텍스트 (unlock 겸)
  await sleep(1100); // telegraph 지나 window
  await page.mouse.move(W * 0.5, H * 0.4);
  await page.mouse.down();
  await page.mouse.move(W * 0.3, H * 0.48, { steps: 6 });
  await page.mouse.up(); // 절단
  await sleep(400);
  await expectSfx(page, ['telegraph', 'event_success'], 'spider');
  await page.close();
}

// 3) 종료 사운드 — RESULT(quit) → game_over + UI 탭 + 별
{
  const page = await scene('stage=stage_01&events=off&debug=0');
  await page.mouse.click(PAN.x, PAN.y); // unlock
  await sleep(300);
  await page.mouse.click(W * 0.97, H * 0.02); // RESULT
  await sleep(900);
  await expectSfx(page, ['game_over'], 'endstage');
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors, missingSfx: missing }, null, 2));
if (errors.length || missing.length) process.exitCode = 1;
