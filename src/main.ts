import Phaser from 'phaser';
import { DESIGN } from './data/layout';
import { PALETTE } from './data/palette';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

// 세로 9:16 논리 해상도 720×1280(ADR-0004), FIT + 중앙 정렬. 입력은 pointerdown 기준(GDD §2).
// `?renderer=canvas`로 CANVAS 강제 — 헤드리스 QA(Playwright)용. 기본은 AUTO(WebGL 우선).
const forceCanvas = new URLSearchParams(window.location.search).get('renderer') === 'canvas';

new Phaser.Game({
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: PALETTE.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN.width,
    height: DESIGN.height,
  },
  input: { activePointers: 2 },
  render: { roundPixels: true },
  scene: [BootScene, PreloadScene, GameScene, ResultScene],
});
