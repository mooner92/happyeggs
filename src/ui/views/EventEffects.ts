import Phaser from 'phaser';
import { DEPTH, DESIGN } from '../../data/layout';
import { CAT_STYLE, TELEGRAPH_STYLE } from '../../data/palette';

/**
 * 거미줄 트로피 (GDD §8.1 ①) — 거미줄을 자른 뒤 잘린 거미줄이 라운드 끝까지 바람에 휘날린다.
 * 씬이 매 프레임 redraw(timeMs)로 흔든다.
 */
export class WebTrophyView {
  private readonly g: Phaser.GameObjects.Graphics;
  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
  ) {
    this.g = scene.add.graphics().setDepth(DEPTH.effect);
  }

  redraw(timeMs: number): void {
    const g = this.g;
    g.clear();
    g.lineStyle(3, TELEGRAPH_STYLE.web, 0.85);
    g.beginPath();
    g.moveTo(this.x, 0);
    const segs = 8;
    const len = 150;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const sway = Math.sin(timeMs / 240 + t * 5) * 14 * t;
      g.lineTo(this.x + sway, len * t);
    }
    g.strokePath();
  }

  destroy(): void {
    this.g.destroy();
  }
}

/**
 * 고양이 (GDD §8.1 ②) — 강도 성공 시 튀어나와 화면을 가로질러 쫓아낸다. 자체 애니 후 소멸.
 */
export class CatView {
  constructor(scene: Phaser.Scene) {
    const y = DESIGN.height * 0.44;
    const g = scene.add.graphics().setDepth(DEPTH.effect);
    let x = -80;
    const draw = () => {
      g.clear();
      // 몸통
      g.fillStyle(CAT_STYLE.body, 1);
      g.fillEllipse(x, y, 96, 56);
      // 머리
      g.fillCircle(x + 42, y - 10, 26);
      // 귀
      g.fillStyle(CAT_STYLE.ear, 1);
      g.fillTriangle(x + 32, y - 30, x + 44, y - 30, x + 34, y - 50);
      g.fillTriangle(x + 46, y - 30, x + 58, y - 30, x + 56, y - 50);
      // 눈
      g.fillStyle(CAT_STYLE.eye, 1);
      g.fillCircle(x + 38, y - 12, 4);
      g.fillCircle(x + 50, y - 12, 4);
      // 꼬리
      g.lineStyle(8, CAT_STYLE.body, 1);
      g.lineBetween(x - 44, y, x - 74, y - 26);
    };
    draw();
    scene.tweens.addCounter({
      from: -80,
      to: DESIGN.width + 100,
      duration: 620,
      ease: 'Cubic.easeInOut',
      onUpdate: (tw) => {
        x = tw.getValue() ?? x;
        draw();
      },
      onComplete: () => g.destroy(),
    });
  }
}
