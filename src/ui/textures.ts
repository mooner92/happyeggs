import Phaser from 'phaser';

/**
 * 절차적 텍스처 생성 (ADR-0009) — 캔버스 방사형 그라데이션으로 벡터 도형이 못 내는
 * 부드러운 그림자·광택·스팀을 만든다. BootScene에서 1회 생성 후 전역 텍스처로 재사용.
 */
export function generateProcTextures(scene: Phaser.Scene): void {
  const make = (key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) => {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx, size);
    scene.textures.addCanvas(key, canvas);
  };
  const radial = (ctx: CanvasRenderingContext2D, s: number, inner: string, outer: string) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  };
  make('soft-shadow', 128, (ctx, s) => radial(ctx, s, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'));
  make('soft-glow', 128, (ctx, s) => radial(ctx, s, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'));
  make('steam', 64, (ctx, s) => radial(ctx, s, 'rgba(255,248,238,0.85)', 'rgba(255,248,238,0)'));
  make('spark', 48, (ctx, s) => radial(ctx, s, 'rgba(255,214,110,0.95)', 'rgba(255,214,110,0)'));

  // 팬 조리면 (디자인 v1) — 중심 밝고 가장자리 어두운 방사 그라데이션 + 브러시드 링 + 기름 얼룩.
  // 정적 1회 생성 — 뷰는 이걸 타원으로 눌러(displaySize) 그린다.
  make('pan-surface', 512, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, '#4d4d4b');
    g.addColorStop(0.55, '#434342');
    g.addColorStop(0.92, '#333332');
    g.addColorStop(1, '#2a2a29');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    // 브러시드 링 — 은은한 동심원
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 2;
    for (let r = 40; r < c - 12; r += 34) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 기름 얼룩 — 살짝 밝은 랜덤 블롭(결정적 좌표)
    ctx.fillStyle = 'rgba(255,240,210,0.05)';
    const spots: [number, number, number][] = [
      [0.36, 0.42, 46],
      [0.62, 0.3, 34],
      [0.55, 0.66, 52],
      [0.3, 0.62, 30],
    ];
    for (const [px, py, pr] of spots) {
      ctx.beginPath();
      ctx.arc(px * s, py * s, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 비네트 (디자인 v1) — 화면 가장자리를 은은하게 어둡게, 시선을 중앙으로
  make('vignette', 256, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, s * 0.32, c, c, s * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** 오브젝트 아래 부드러운 접지 그림자 스프라이트 */
export function addSoftShadow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  alpha = 0.5,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, 'soft-shadow')
    .setDisplaySize(w, h)
    .setAlpha(alpha)
    .setDepth(depth);
}
