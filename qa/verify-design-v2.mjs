// 디자인 v2 QA — 타이틀 씬, 한글+Jua UI, 팔레트 v2/스트링 라이트, 씬 전환 플로우.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] ?? 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = 'qa/shots-v2';
mkdirSync(OUT, { recursive: true });
const W = 720,
  H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errors = [];

const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

// 1) 타이틀 (기본 진입 — 딥링크 파라미터 없음)
await page.goto(`${BASE}?renderer=canvas`, { waitUntil: 'networkidle' });
await sleep(1400); // 폰트 로드 + 페이드인
await page.screenshot({ path: `${OUT}/01-title.png` });

// 2) 시작 → 게임 (한글 HUD + 팔레트 v2 + 스트링 라이트)
await page.mouse.click(W / 2, H * 0.68); // "시작" 버튼 (TITLE.startYRatio)
await sleep(1200);
await page.screenshot({ path: `${OUT}/02-game-korean-v2.png` });

// 3) 한 판 서빙 → 결과 화면 (한글)
await page.mouse.click(PAN.x, PAN.y);
await sleep(6300);
await page.mouse.move(PAN.x, PAN.y);
await page.mouse.down();
await sleep(480);
await page.mouse.up();
await sleep(700);
await page.mouse.move(PAN.x, PAN.y);
await page.mouse.down();
await page.mouse.move(PAN.x, PAN.y - 160, { steps: 6 });
await page.mouse.up();
await sleep(500);
await page.mouse.click(W * 0.97, H * 0.02); // 결과 ▸
await sleep(1100);
await page.screenshot({ path: `${OUT}/03-result-korean.png` });

// 4) 상점 (한글)
await page.mouse.click(W / 2 - 130, H * 0.935); // 상점
await sleep(1100);
await page.screenshot({ path: `${OUT}/04-shop-korean.png` });

await browser.close();
console.log(JSON.stringify({ consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
