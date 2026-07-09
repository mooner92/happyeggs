// M5 QA — 야간 열화상(stage_03), 불 끄기 적(소화→재점화), 스킨 상점(구매→장착→계란 색).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-m5';
mkdirSync(OUT, { recursive: true });
const W = 720,
  H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

async function scene(query, seedCoins = 0) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  if (seedCoins > 0) {
    // 지갑 시드 — 상점 구매 검증용 (저장 v3 스키마). 콜백은 브라우저 컨텍스트에서 실행됨
    await page.addInitScript((coins) => {
      // eslint-disable-next-line no-undef
      localStorage.setItem(
        'eggflip.save',
        JSON.stringify({
          schemaVersion: 3,
          stages: {},
          coins,
          ownedSkins: ['classic'],
          equippedSkin: 'classic',
        }),
      );
    }, seedCoins);
  }
  await page.goto(`${BASE}?renderer=canvas&${query}`, { waitUntil: 'networkidle' });
  await sleep(700);
  return page;
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });

// 1) 야간 stage_03 — 열화상: 남색 오버레이, 불꽃·조리 계란만 밝게
{
  const page = await scene('stage=stage_03&events=off&debug=0');
  await shot(page, '01-night-overview');
  await page.mouse.click(PAN.x, PAN.y); // 깨기 → 열 글로우
  await sleep(2500);
  await shot(page, '02-night-egg-hotglow');
  await page.close();
}

// 2) 불 끄기 적 — 방치 → 소화(가짜 파란불) → 조리 정지 → 팬 탭 재점화
{
  const page = await scene('stage=stage_03&spawn=fire_snuffer&spawnAfter=800&events=off');
  await page.mouse.click(PAN.x, PAN.y); // 계란(조리 중 컨텍스트)
  await sleep(800 + 1400); // 잠입(telegraph 1300) 지나 window
  await shot(page, '03-snuffer-window');
  await sleep(1700); // window 만료 → fire_out
  await shot(page, '04-fire-out-fake-blue'); // 가짜불(차가운 파란 불꽃)
  await sleep(1200); // 조리 정지 확인 시간(HUD d= 멈춤)
  await shot(page, '05-cooking-paused');
  await page.mouse.click(PAN.x, PAN.y + 120); // 스토브/팬 탭 → 재점화
  await sleep(500);
  await shot(page, '06-reignited');
  await page.close();
}

// 3) 상점 — RESULT → SHOP → golden 구매(코인 차감·EQUIPPED) → PLAY → 계란 노른자 색 반영
{
  const page = await scene('stage=stage_01&events=off&debug=0', 100); // 지갑 100 시드
  await page.mouse.click(W * 0.97, H * 0.02); // RESULT
  await sleep(900);
  await page.mouse.click(W / 2 - 130, H * 0.935); // SHOP 버튼
  await sleep(900);
  await shot(page, '07-shop-grid'); // 카드 4장 + 지갑 100
  await page.mouse.click(525, 380); // golden 카드(1번, 우상단) 탭 = 구매+장착
  await sleep(500);
  await shot(page, '08-shop-golden-equipped'); // EQUIPPED + 지갑 40
  await page.mouse.click(W / 2, H * 0.93); // PLAY >
  await sleep(1000);
  await page.mouse.click(PAN.x, PAN.y); // 깨기
  await sleep(1500);
  await shot(page, '09-golden-yolk-ingame'); // 금색 노른자
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
