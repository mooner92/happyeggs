import Phaser from 'phaser';
import { COUNTER_BAND, DEPTH, DESIGN, SERVE_BAR, WALL_TILE } from '../../data/layout';
import { COUNTER_STYLE, KITCHEN_STYLE, STRING_LIGHT, WALL_GRADIENT } from '../../data/palette';

/**
 * 주방 무대 (구체화 패스) — 손님 서빙 바 · 타일 벽 · 조리 카운터의 3단 구조로
 * "손님 창구 앞에서 굽는 1인칭 주방"을 읽히게 한다. 전부 정적 도형(1회 드로우).
 *
 *   [천장 음영]
 *   [손님 대기열]  ← 서빙 바 뒤
 *   [서빙 바 ━━━━]
 *   [타일 벽 + 아이템 거치판]
 *   [조리 카운터 + 스토브 + 팬]
 */
export class KitchenView {
  constructor(scene: Phaser.Scene) {
    const counterTop = DESIGN.height * COUNTER_BAND.topRatio;
    const barTop = DESIGN.height * SERVE_BAR.topRatio;
    const barBottom = barTop + SERVE_BAR.heightPx;

    const g = scene.add.graphics().setDepth(DEPTH.counter);

    // 벽 — 위→아래 그라데이션 (은은한 명암으로 공간감)
    g.fillGradientStyle(
      WALL_GRADIENT.top,
      WALL_GRADIENT.top,
      WALL_GRADIENT.bottom,
      WALL_GRADIENT.bottom,
      1,
    );
    g.fillRect(0, 0, DESIGN.width, counterTop);

    // 천장 음영 — 위쪽 살짝 어둡게, 실내 볼륨감
    g.fillStyle(KITCHEN_STYLE.ceilingShade, 0.18);
    g.fillRect(0, 0, DESIGN.width, 46);

    // 타일 벽 — 서빙 바 아래 ~ 카운터 위, 벽돌식 줄눈(행마다 반칸 오프셋)
    g.lineStyle(WALL_TILE.lineW, KITCHEN_STYLE.tileLine, WALL_TILE.alpha);
    let row = 0;
    for (let y = barBottom + WALL_TILE.rowPx; y < counterTop; y += WALL_TILE.rowPx, row++) {
      g.lineBetween(0, y, DESIGN.width, y);
    }
    row = 0;
    for (let y = barBottom; y < counterTop; y += WALL_TILE.rowPx, row++) {
      const offset = row % 2 === 0 ? 0 : WALL_TILE.colPx / 2;
      const rowBottom = Math.min(y + WALL_TILE.rowPx, counterTop);
      for (let x = offset; x <= DESIGN.width; x += WALL_TILE.colPx) {
        g.lineBetween(x, y, x, rowBottom);
      }
    }

    // 조리 카운터 (하단) — 앞면 + 윗면 + 립
    g.fillStyle(COUNTER_STYLE.front, 1);
    g.fillRect(0, counterTop, DESIGN.width, DESIGN.height - counterTop);
    g.fillStyle(COUNTER_STYLE.top, 1);
    g.fillRect(0, counterTop, DESIGN.width, COUNTER_BAND.lipPx * 2.4);
    g.fillStyle(COUNTER_STYLE.lip, 1);
    g.fillRect(0, counterTop, DESIGN.width, 4);

    // 서빙 바 — 손님 몸 아래를 가리는 카운터 밴드 (손님보다 앞 depth)
    const bar = scene.add.graphics().setDepth(DEPTH.queue + 1);
    bar.fillStyle(KITCHEN_STYLE.serveBarFront, 1);
    bar.fillRect(0, barTop, DESIGN.width, SERVE_BAR.heightPx);
    bar.fillStyle(KITCHEN_STYLE.serveBarTop, 1);
    bar.fillRect(0, barTop, DESIGN.width, SERVE_BAR.lipPx * 3);
    bar.fillStyle(KITCHEN_STYLE.serveBarLip, 1);
    bar.fillRect(0, barTop, DESIGN.width, SERVE_BAR.lipPx);

    // 스트링 라이트 (디자인 v2) — 벽 상단을 가로지르는 처진 전선 + 따뜻한 알전구
    this.drawStringLights(scene, barBottom + 34);
  }

  /** 알전구 줄 — 2번 처지는 전선 위에 전구 7개 + soft-glow 후광 (정적 1회 드로우) */
  private drawStringLights(scene: Phaser.Scene, y: number): void {
    const g = scene.add.graphics().setDepth(DEPTH.item - 1);
    const sag = 22; // 전선 처짐 깊이
    const n = 7;
    g.lineStyle(3, STRING_LIGHT.wire, 0.9);
    // 전선 — 반 사인파 2굽이로 처진 곡선을 폴리라인 근사
    g.beginPath();
    const seg = 28;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const px = DESIGN.width * t;
      const py = y + Math.abs(Math.sin(t * Math.PI * 2)) * sag;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
    // 전구 — 전선 위 등간격, 소켓 + 알 + 후광
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bx = DESIGN.width * t;
      const by = y + Math.abs(Math.sin(t * Math.PI * 2)) * sag;
      scene.add
        .image(bx, by + 14, 'soft-glow')
        .setDisplaySize(64, 64)
        .setTint(STRING_LIGHT.glow)
        .setAlpha(0.28)
        .setDepth(DEPTH.item - 1);
      g.fillStyle(STRING_LIGHT.wire, 1);
      g.fillRect(bx - 3, by, 6, 7); // 소켓
      g.fillStyle(STRING_LIGHT.bulb, 1);
      g.fillCircle(bx, by + 14, 7); // 알전구
      g.lineStyle(3, 0x8a6a3a, 1);
      g.strokeCircle(bx, by + 14, 7);
    }
  }
}
