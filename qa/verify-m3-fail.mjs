import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('qa/shots-m3', { recursive: true });
const b = await chromium.launch({ args: ['--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport:{width:720,height:1280}, deviceScaleFactor:2 });
const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text())); p.on('pageerror',e=>errs.push(e.message));
const shot=n=>p.screenshot({path:`qa/shots-m3/${n}.png`});
await p.goto('http://localhost:5173/?renderer=canvas&stage=stage_01&events=off&debug=0',{waitUntil:'networkidle'});
await new Promise(r=>setTimeout(r,600));
await p.mouse.click(360,742); // 계란 깨고 방치
await new Promise(r=>setTimeout(r,13300)); // SMOKE(13s)+유예 진입
await shot('03-smoke');
await new Promise(r=>setTimeout(r,3300)); // 유예 3s 경과 → 스프링클러
await shot('04-sprinkler');
await new Promise(r=>setTimeout(r,1400)); // 실패 결과로 전환
await shot('05-fail-result');
console.log(JSON.stringify({errs}));
await b.close();
