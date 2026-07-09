import Phaser from 'phaser';
import { ASSET_MANIFEST } from '../data/assets';

/** 에셋 키 매니페스트 순회 로더 — M0는 빈 매니페스트라 즉시 통과한다 (파이프 증명, GDD §14) */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const entry of ASSET_MANIFEST) {
      switch (entry.type) {
        case 'image':
          this.load.image(entry.key, entry.url);
          break;
        case 'atlas':
          this.load.atlas(entry.key, entry.url);
          break;
        case 'audio':
          this.load.audio(entry.key, entry.url);
          break;
      }
    }
  }

  create(): void {
    // 타이틀 화면으로 (디자인 v2). QA/딥링크(?stage=·?spawn=·?scene=game)는 바로 게임
    const p = new URLSearchParams(window.location.search);
    const direct = p.has('stage') || p.has('spawn') || p.get('scene') === 'game';
    this.scene.start(direct ? 'Game' : 'Title');
  }
}
