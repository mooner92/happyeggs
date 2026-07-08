import Phaser from 'phaser';
import { generateProcTextures } from '../ui/textures';

/** 최소 초기화 — 절차적 텍스처(그림자·광택·스팀) 생성 후 Preload로 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateProcTextures(this);
    this.scene.start('Preload');
  }
}
