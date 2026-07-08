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
