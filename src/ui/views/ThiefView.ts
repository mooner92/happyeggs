import Phaser from 'phaser';
import { DEPTH, DESIGN } from '../../data/layout';
import { ROBBER_STYLE } from '../../data/palette';

/**
 * 아이템 도둑 (GDD §8.1·§9 도난 연쇄) — RAW 뒤집기 발사체를 틈타 앞 손님이 난입,
 * 주방 아이템을 훔쳐 달아난다. 스윕 인 → 낚아챔(onGrab) → 화면 밖 도주.
 */
export class ThiefView {
  private readonly c: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    tx: number,
    ty: number,
    private readonly onGrab: () => void,
    private readonly onDone: () => void,
  ) {
    const g = scene.add.graphics();
    // 후드 도둑 (강도 톤 재사용)
    g.fillStyle(ROBBER_STYLE.bag, 1);
    g.fillCircle(20, -6, 14); // 자루
    g.fillStyle(ROBBER_STYLE.body, 1);
    g.fillEllipse(0, 0, 60, 84);
    g.fillStyle(ROBBER_STYLE.hood, 1);
    g.fillEllipse(0, -22, 54, 42);
    g.fillStyle(ROBBER_STYLE.eye, 1);
    g.fillCircle(-8, -22, 4);
    g.fillCircle(8, -22, 4);
    this.c = scene.add.container(tx, -120, [g]).setDepth(DEPTH.enemy + 1);

    // 1) 아이템으로 급강하 → 2) 낚아채고 가까운 가장자리로 도주
    const exitX = tx < DESIGN.width / 2 ? -160 : DESIGN.width + 160;
    scene.tweens.add({
      targets: this.c,
      x: tx,
      y: ty,
      duration: 340,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.onGrab();
        scene.tweens.add({
          targets: this.c,
          x: exitX,
          y: ty - 40,
          angle: tx < DESIGN.width / 2 ? -18 : 18,
          duration: 420,
          ease: 'Back.easeIn',
          onComplete: () => {
            this.c.destroy();
            this.onDone();
          },
        });
      },
    });
  }
}
