// M1 뒤집기 상호작용 QA (Playwright) — 크랙→익힘→게이지→뒤집기(클린/이탈)→스와이프 서빙→점수.
// 게이지는 결정론적(홀드시간→값)이라 릴리즈 타이밍으로 결과를 만든다: 홀드 중 스크린샷은 타이밍을 흐리므로
// '정밀 홀드'(클린)에는 중간 스크린샷을 넣지 않는다. 게이지 표시는 별도 오버차지 홀드에서 확인한다.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173/';
const URL = BASE.replace(/\/?$/, '/') + '?renderer=canvas';
const OUT = 'qa/shots-m1';
mkdirSync(OUT, { recursive: true });

const W = 720;
const H = 1280;
const PAN = { x: W * 0.5, y: H * 0.58 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(600);

// 계란 A — 깨고 익힌다
await page.mouse.click(PAN.x, PAN.y);
await sleep(300);
await shot('01-cracked');
await sleep(6000);
await shot('02-cooked'); // PERFECT_WINDOW 근처

// 게이지 표시 확인 + 오버차지 이탈 (게이지 값 > 스윗스팟 → FLEW_OFF, 계란 A 소실)
await page.mouse.move(PAN.x, PAN.y);
await page.mouse.down();
await sleep(320); // > 탭 임계(180ms) → 게이지 표시
await shot('03-gauge-visible');
await sleep(320); // 총 ~0.64s → 게이지 값 ~1.0 (스윗스팟 초과)
await page.mouse.up();
await sleep(700);
await shot('04-flew-off'); // 계란 위로 날아가 소실 (eggs 0/3)

// 계란 B — 깨고 익힌 뒤 '정밀 홀드'로 클린 뒤집기 (중간 스크린샷 없음)
await page.mouse.click(PAN.x, PAN.y);
await sleep(5000);
await shot('05-egg-b-cooked'); // SET~PERFECT
await page.mouse.move(PAN.x, PAN.y);
await page.mouse.down();
await sleep(450); // 값 = triangle(0.45/1.2=0.375) = 0.75 ∈ [0.7,0.9] → CLEAN
await page.mouse.up();
await sleep(650);
await shot('06-clean-landed'); // 계란 B 팬 위 유지(뒤집힘)

// 위로 스와이프 → 서빙 + 점수 팝업
await page.mouse.move(PAN.x, PAN.y);
await page.mouse.down();
await page.mouse.move(PAN.x, PAN.y - 220, { steps: 8 });
await page.mouse.up();
await sleep(220);
await shot('07-served-score');
await sleep(500);
await shot('08-after-serve');

await browser.close();
console.log(JSON.stringify({ url: URL, consoleErrors: errors }, null, 2));
if (errors.length) process.exitCode = 1;
