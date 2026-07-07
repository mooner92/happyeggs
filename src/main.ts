import Phaser from 'phaser';

// M0 커밋 1: 빈 캔버스 부트. 씬 골격은 커밋 4에서, 해상도 상수는 커밋 3의 data/layout.ts로 이동한다.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2b2b2b',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720, // ADR-0004 — 커밋 3에서 layout.DESIGN으로 대체
    height: 1280,
  },
});
