import Phaser from 'phaser';
import { DEPTH, ITEM } from '../../data/layout';
import { ITEM_STYLE } from '../../data/palette';

/**
 * 주방 아이템 (GDD §9) — 벽/선반에 배치되어 탭으로 대응 입력이 된다.
 * 뚜껑(재채기)·토치(머리카락)·펜싱칼(저격수)·방패(decoy 미스리드).
 * 매칭 적이 활성이면 setHint(true)로 살짝 진동하며 정답을 흘려준다.
 */
export class ItemView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;
  private hint = false;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    private readonly x: number,
    private readonly y: number,
    onTap: (id: string) => void,
  ) {
    this.g = scene.add.graphics().setDepth(DEPTH.item);
    this.zone = scene.add
      .zone(x, y, ITEM.hitR * 2, ITEM.hitR * 2)
      .setDepth(DEPTH.item)
      .setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => {
      e?.stopPropagation?.();
      this.pop();
      onTap(this.id);
    });
    this.draw(0);
  }

  /** 매칭 적 활성 여부 — true면 힌트 진동 */
  setHint(on: boolean): void {
    if (on === this.hint) return;
    this.hint = on;
    if (!on) this.draw(0); // 힌트 해제 시 링 제거를 위해 1회 재그리기
  }

  update(dtMs: number): void {
    if (!this.hint) return;
    this.t += dtMs;
    const wob = Math.sin(this.t / 90) * 3;
    this.draw(wob);
  }

  private pop(): void {
    this.scene.tweens.add({
      targets: this.g,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** decoy 개그 (GDD §9) — 방패 손잡이가 툭 떨어지는 헛수고 연출 (페널티 없음) */
  gag(): void {
    const handle = this.scene.add.graphics().setDepth(DEPTH.item + 1);
    handle.fillStyle(ITEM_STYLE.swordGuard, 1);
    handle.fillRoundedRect(this.x - 6, this.y + ITEM.drawR * 0.4, 12, 22, 4);
    this.scene.tweens.add({
      targets: handle,
      y: 90,
      alpha: 0,
      angle: 140,
      duration: 520,
      ease: 'Quad.easeIn',
      onComplete: () => handle.destroy(),
    });
    this.scene.tweens.add({
      targets: this.g,
      angle: { from: -8, to: 0 },
      duration: 260,
      ease: 'Sine.easeOut',
    });
  }

  private draw(dx: number): void {
    const g = this.g;
    const r = ITEM.drawR;
    g.clear();
    // 트윈 스케일 기준점(피벗)을 좌표로 잡기 위해 원점 이동
    g.setPosition(this.x + dx, this.y);
    // 벽걸이 판 (은은한 배경 원)
    g.fillStyle(ITEM_STYLE.plate, 0.28);
    g.fillCircle(0, 0, r + 8);
    if (this.hint) {
      g.lineStyle(3, 0x9be564, 0.9);
      g.strokeCircle(0, 0, r + 8);
    }
    switch (this.id) {
      case 'lid':
        this.drawLid(g, r);
        break;
      case 'torch':
        this.drawTorch(g, r);
        break;
      case 'fencing_sword':
        this.drawSword(g, r);
        break;
      case 'shield_decoy':
        this.drawShield(g, r);
        break;
      default:
        g.fillStyle(0xffffff, 1);
        g.fillCircle(0, 0, r * 0.6);
    }
  }

  private drawLid(g: Phaser.GameObjects.Graphics, r: number): void {
    // 반구형 뚜껑 + 손잡이
    g.fillStyle(ITEM_STYLE.lid, 1);
    g.beginPath();
    g.arc(0, r * 0.35, r, Math.PI, 0, false);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, ITEM_STYLE.lidEdge, 1);
    g.beginPath();
    g.arc(0, r * 0.35, r, Math.PI, 0, false);
    g.strokePath();
    g.lineBetween(-r, r * 0.35, r, r * 0.35);
    g.fillStyle(ITEM_STYLE.lidKnob, 1);
    g.fillCircle(0, -r * 0.55, r * 0.2);
  }

  private drawTorch(g: Phaser.GameObjects.Graphics, r: number): void {
    // 손잡이 막대
    g.fillStyle(ITEM_STYLE.torchStick, 1);
    g.fillRect(-r * 0.14, -r * 0.1, r * 0.28, r * 1.1);
    // 불꽃
    g.fillStyle(ITEM_STYLE.torchFlame, 1);
    g.fillTriangle(-r * 0.5, -r * 0.1, r * 0.5, -r * 0.1, 0, -r * 1.05);
    g.fillStyle(ITEM_STYLE.torchFlameCore, 1);
    g.fillTriangle(-r * 0.26, -r * 0.15, r * 0.26, -r * 0.15, 0, -r * 0.75);
  }

  private drawSword(g: Phaser.GameObjects.Graphics, r: number): void {
    // 얇은 대각 검신 + 가드
    g.lineStyle(5, ITEM_STYLE.sword, 1);
    g.lineBetween(-r * 0.6, r * 0.7, r * 0.7, -r * 0.75);
    g.lineStyle(2, ITEM_STYLE.swordEdge, 1);
    g.lineBetween(-r * 0.6, r * 0.7, r * 0.7, -r * 0.75);
    // 가드
    g.lineStyle(5, ITEM_STYLE.swordGuard, 1);
    g.lineBetween(-r * 0.75, r * 0.35, -r * 0.2, r * 0.8);
    // 손잡이 끝 포멜
    g.fillStyle(ITEM_STYLE.swordGuard, 1);
    g.fillCircle(-r * 0.62, r * 0.72, r * 0.12);
  }

  private drawShield(g: Phaser.GameObjects.Graphics, r: number): void {
    // 방패 (decoy) — 오각 방패
    g.fillStyle(ITEM_STYLE.shield, 1);
    g.beginPath();
    g.moveTo(0, -r * 0.9);
    g.lineTo(r * 0.8, -r * 0.5);
    g.lineTo(r * 0.6, r * 0.85);
    g.lineTo(0, r);
    g.lineTo(-r * 0.6, r * 0.85);
    g.lineTo(-r * 0.8, -r * 0.5);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, ITEM_STYLE.shieldEdge, 1);
    g.strokePath();
    g.fillStyle(ITEM_STYLE.shieldBoss, 1);
    g.fillCircle(0, 0, r * 0.22);
  }

  destroy(): void {
    this.g.destroy();
    this.zone.destroy();
  }
}
