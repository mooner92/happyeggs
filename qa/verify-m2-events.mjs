// M2 방해꾼 이벤트 QA — ?spawn=으로 거미·강도를 강제 스폰해 대응/실패를 검증.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-m2';
mkdirSync(OUT, { recursive: true });
const W = 720, H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

async function scene(query) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}?renderer=canvas&${query}`, { waitUntil: 'networkidle' });
  await sleep(500);
  // 계란 하나 깨서 '조리 중' 상태 유지 (이벤트 진행 컨텍스트)
  await page.mouse.click(PAN.x, PAN.y);
  await sleep(200);
  return page;
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });

// 1) 거미 — telegraph 하강 → window에서 드래그 절단(성공) → 거미줄 트로피
{
  const page = await scene('spawn=ninja_spider');
  await sleep(1000); // telegraph(900) 지나 window 진입
  await shot(page, '01-spider-window');
  // 드래그(거미줄 절단)
  await page.mouse.move(W * 0.5, H * 0.4);
  await page.mouse.down();
  await page.mouse.move(W * 0.3, H * 0.48, { steps: 6 });
  await page.mouse.up();
  await sleep(500);
  await shot(page, '02-spider-cut-trophy');
  await page.close();
}

// 2) 거미 — 방치 → 실패(후라이 반토막)
{
  const page = await scene('spawn=ninja_spider');
  await sleep(900 + 2000 + 200); // telegraph + window 만료 → fail
  await shot(page, '03-spider-timeout-bisect');
  await page.close();
}

// 3) 강도 — 계란 준비 후(지연 스폰) window에서 더블탭(고양이) 성공
{
  const page = await scene('spawn=back_robber&spawnAfter=1200'); // scene()이 계란 1개 깸
  await sleep(1200 + 900); // 스폰 후 telegraph(800) 지나 window
  await shot(page, '04-robber-window');
  await page.mouse.click(PAN.x, PAN.y + 40);
  await sleep(90);
  await page.mouse.click(PAN.x, PAN.y + 40);
  await sleep(400);
  await shot(page, '05-robber-cat');
  await page.close();
}

// 4) 강도 — 방치 → 실패(노른자 파손, 계란 위에서)
{
  const page = await scene('spawn=back_robber&spawnAfter=1200');
  await sleep(1200 + 800 + 1900 + 300); // 스폰 후 telegraph+window 만료
  await shot(page, '06-robber-yolk-steal');
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
