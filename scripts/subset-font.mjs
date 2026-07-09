// 폰트 서브셋 (디자인 v2) — src/에서 실제 사용하는 글자만 추려 Jua를 woff2로 압축.
// 원본: fonts-src/Jua-Regular.ttf (OFL — fonts-src/OFL.txt) → 출력: public/fonts/jua.woff2
// UI 문자열(한글)을 추가/변경하면 `npm run font:subset`을 다시 실행한다.
import subsetFont from 'subset-font';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIRS = ['src', 'index.html'];
const IN = 'fonts-src/Jua-Regular.ttf';
const OUT = 'public/fonts/jua.woff2';

/** 디렉터리 재귀 순회 — .ts/.html만 */
function* walk(p) {
  const st = statSync(p);
  if (st.isFile()) {
    if (/\.(ts|html)$/.test(p)) yield p;
    return;
  }
  for (const name of readdirSync(p)) yield* walk(join(p, name));
}

// 사용 문자 수집 — 전체 인쇄 가능 ASCII + 소스의 비ASCII 문자(주석 제외 어려우니 전부 포함해도
// 한글 자모 조합 수백 자 수준 — 안전 마진으로 충분)
const chars = new Set();
for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c)); // ASCII
chars.add('×'); // HUD 재고 표기
chars.add('▸'); // 버튼 화살표
chars.add('★');
for (const root of SRC_DIRS) {
  for (const f of walk(root)) {
    for (const ch of readFileSync(f, 'utf8')) {
      if (ch.charCodeAt(0) > 0x7e) chars.add(ch);
    }
  }
}

const text = [...chars].join('');
const buf = readFileSync(IN);
const woff2 = await subsetFont(buf, text, { targetFormat: 'woff2' });
mkdirSync('public/fonts', { recursive: true });
writeFileSync(OUT, woff2);
console.log(`subset: ${chars.size} chars, ${IN} ${(buf.length / 1024).toFixed(0)}KB -> ${OUT} ${(woff2.length / 1024).toFixed(1)}KB`);
