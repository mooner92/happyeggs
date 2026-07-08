// M4 적 확장 + 아이템 QA — 아이템 배치/탭, 재채기·머리카락·파리의 성공/실패를 검증.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-m4';
mkdirSync(OUT, { recursive: true });
const W = 720,
  H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
// 아이템 좌표 (data/items ITEM_POS × DESIGN)
const ITEM = {
  lid: { x: W * 0.09, y: H * 0.33 },
  torch: { x: W * 0.9, y: H * 0.52 },
  sword: { x: W * 0.91, y: H * 0.33 },
  shield: { x: W * 0.1, y: H * 0.52 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

async function scene(query) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}?renderer=canvas&${query}`, { waitUntil: 'networkidle' });
  await sleep(500);
  // 계란 하나 깨서 '조리 중' 유지 (이벤트 진행 + 감점 대상 확보)
  await page.mouse.click(PAN.x, PAN.y);
  await sleep(200);
  return page;
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });
const tapItem = async (page, it) => {
  await page.mouse.click(it.x, it.y);
  await sleep(80);
};

// 0) 아이템 배치 렌더 (stage_01) + decoy 개그
{
  const page = await scene('stage=stage_02&events=off');
  await shot(page, '00-items-placed');
  await tapItem(page, ITEM.shield); // decoy → 손잡이 개그 (무해)
  await sleep(300);
  await shot(page, '01-decoy-gag');
  await page.close();
}

// 1) 재채기 손님 — window에서 뚜껑 탭(성공: 막음 플래시)
{
  const page = await scene('stage=stage_02&spawn=sneeze_troll&events=off');
  await sleep(1200); // telegraph(1100) 지나 window
  await shot(page, '02-sneeze-window');
  await tapItem(page, ITEM.lid);
  await sleep(400);
  await shot(page, '03-sneeze-blocked');
  await page.close();
}

// 2) 재채기 방치 → 즉시 게임 오버 (Result FAILED sneeze)
{
  const page = await scene('stage=stage_02&spawn=sneeze_troll&events=off');
  await sleep(1100 + 1600 + 1200); // telegraph+window 만료 → game_over → Result
  await shot(page, '04-sneeze-gameover');
  await page.close();
}

// 3) 머리카락 손님 — window에서 토치 탭(성공: 공중 소각)
{
  const page = await scene('stage=stage_02&spawn=hair_troll&events=off');
  await sleep(1100); // telegraph(1000) 지나 window
  await shot(page, '05-hair-window');
  await tapItem(page, ITEM.torch);
  await sleep(400);
  await shot(page, '06-hair-burned');
  await page.close();
}

// 4) 머리카락 방치 → 안착(−10) — 이후 서빙 점수에 반영
{
  const page = await scene('stage=stage_02&spawn=hair_troll&events=off');
  await sleep(1000 + 1700 + 300);
  await shot(page, '07-hair-landed');
  await page.close();
}

// 5) 파리 — 티배깅(telegraph) → 착지(window) 탭(성공: 별 격추)
{
  const page = await scene('stage=stage_02&spawn=fly&events=off');
  await sleep(800);
  await shot(page, '08-fly-teabag');
  await sleep(700); // telegraph(1400) 지나 window(착지)
  await shot(page, '09-fly-landed');
  await page.mouse.click(PAN.x, PAN.y); // 파리 탭 (window=tap)
  await sleep(400);
  await shot(page, '10-fly-starkill');
  await page.close();
}

// 6) 파리 방치 → 똥(−20)
{
  const page = await scene('stage=stage_02&spawn=fly&events=off');
  await sleep(1400 + 1000 + 300);
  await shot(page, '11-fly-poop');
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
