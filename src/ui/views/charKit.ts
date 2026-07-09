// 캐릭터 스타일 킷 (디자인 v3) — 상용 캐주얼 게임 문법의 공통 어휘.
// 모든 캐릭터/소품 뷰가 이 킷을 써서 스타일을 통일한다:
//   ① 굵은 웜브라운 외곽선 ② 2톤 셰이딩(아랫배 어둡게 + 정수리 하이라이트)
//   ③ 흰자+동공+글린트 눈 ④ 열린 스마일(입 안 + 혀)
import Phaser from 'phaser';

/** 공통 외곽선 — 검정 대신 웜 다크브라운(부드러운 인상), 캐릭터 5px/소품 4px */
export const OUTLINE = { color: 0x3a2418, char: 5, prop: 4 } as const;

/** 볼터치/하이라이트 공통 */
export const CHEEK = { color: 0xff8a8a, alpha: 0.4 } as const;
export const TOP_LIGHT = { color: 0xffffff, alpha: 0.16 } as const;

/** 색을 어둡게 (2톤 셰이딩 하단 톤) — 채널 곱셈 */
export function darken(color: number, f = 0.78): number {
  const r = Math.floor(((color >> 16) & 0xff) * f);
  const g = Math.floor(((color >> 8) & 0xff) * f);
  const b = Math.floor((color & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

/** 색을 밝게 — 흰색 방향 보간 */
export function lighten(color: number, f = 0.25): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return (
    (Math.floor(r + (255 - r) * f) << 16) |
    (Math.floor(g + (255 - g) * f) << 8) |
    Math.floor(b + (255 - b) * f)
  );
}

/**
 * 2톤 몸통 — 채움 + 하단 어두운 초승달 + 정수리 하이라이트 + 외곽선.
 * 모든 캐릭터 몸통의 기본. (타원 기준; w/h는 지름)
 */
export function drawBody2Tone(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: number,
  outlineW: number = OUTLINE.char, // number로 넓힘 — as const 리터럴(5)로 좁혀지지 않게
): void {
  g.fillStyle(color, 1);
  g.fillEllipse(cx, cy, w, h);
  // 하단 셰이드 — 안쪽 어두운 타원 위를 본색으로 덮어 아래 초승달만 남긴다 (몸통 밖 침범 없음)
  g.fillStyle(darken(color), 1);
  g.fillEllipse(cx, cy + h * 0.1, w * 0.9, h * 0.75);
  g.fillStyle(color, 1);
  g.fillEllipse(cx, cy - h * 0.06, w * 0.94, h * 0.82);
  // 정수리 하이라이트
  g.fillStyle(TOP_LIGHT.color, TOP_LIGHT.alpha);
  g.fillEllipse(cx - w * 0.14, cy - h * 0.3, w * 0.42, h * 0.2);
  // 외곽선
  g.lineStyle(outlineW, OUTLINE.color, 1);
  g.strokeEllipse(cx, cy, w, h);
}

/** 살아있는 눈 — 흰자 + 동공(시선 오프셋) + 글린트. r = 흰자 반지름 */
export function drawEye(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  lookX = 0,
  lookY = 0.15,
): void {
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(x, y, r * 2, r * 2.3);
  g.lineStyle(Math.max(2, r * 0.35), OUTLINE.color, 1);
  g.strokeEllipse(x, y, r * 2, r * 2.3);
  g.fillStyle(OUTLINE.color, 1);
  g.fillCircle(x + lookX * r, y + lookY * r, r * 0.55);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x + lookX * r - r * 0.18, y + lookY * r - r * 0.22, r * 0.18);
}

/** 열린 스마일 — 입 안(다크) 반원 + 혀(핑크). w = 입 너비 */
export function drawOpenSmile(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
): void {
  g.fillStyle(0x5c3226, 1);
  g.beginPath();
  g.arc(x, y, w / 2, 0, Math.PI, false);
  g.closePath();
  g.fillPath();
  g.lineStyle(3, OUTLINE.color, 1);
  g.strokePath();
  g.fillStyle(0xff8a7a, 1);
  g.fillEllipse(x, y + w * 0.22, w * 0.55, w * 0.3);
}

/** 볼터치 한 쌍 */
export function drawCheeks(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  y: number,
  dx: number,
  r: number,
): void {
  g.fillStyle(CHEEK.color, CHEEK.alpha);
  g.fillEllipse(cx - dx, y, r * 2, r * 1.4);
  g.fillEllipse(cx + dx, y, r * 2, r * 1.4);
}
