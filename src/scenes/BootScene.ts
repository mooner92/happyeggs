import Phaser from 'phaser';

/** 최소 초기화 후 즉시 Preload로 — 에셋 로드 없음 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
