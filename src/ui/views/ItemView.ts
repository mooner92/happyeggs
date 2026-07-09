import Phaser from 'phaser';
import { DEPTH, ITEM, PLAQUE } from '../../data/layout';
import { ITEM_STYLE, KITCHEN_STYLE, PALETTE } from '../../data/palette';
import { OUTLINE, darken, lighten } from './charKit';

/**
 * 주방 아이템 (GDD §9) — 벽/선반에 배치되어 탭으로 대응 입력이 된다.
 * 뚜껑(재채기)·토치(머리카락)·펜싱칼(저격수)·방패(decoy 미스리드).
 * 매칭 적이 활성이면 setHint(true)로 살짝 진동하며 정답을 흘려준다.
 * 디자인 v3: 4종 전부 웜브라운 외곽선 + 2톤 셰이딩 (charKit 스타일 통일).
 */
export class ItemView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;
  private hint = false;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    readonly x: number,
    readonly y: number,
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
    handle.lineStyle(3, OUTLINE.color, 1);
    handle.strokeRoundedRect(this.x - 6, this.y + ITEM.drawR * 0.4, 12, 22, 4);
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
    // 나무 거치판 + 금속 걸이 — 아이템이 "벽에 걸려 있음"을 읽히게 (구체화 패스)
    const pw = PLAQUE.w;
    const ph = PLAQUE.h;
    g.fillStyle(ITEM_STYLE.plate, 0.35); // 판 뒤 그림자
    g.fillRoundedRect(-pw / 2 + 4, -ph / 2 + 6, pw, ph, PLAQUE.r);
    g.fillStyle(KITCHEN_STYLE.plaque, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, PLAQUE.r);
    g.lineStyle(3, KITCHEN_STYLE.plaqueEdge, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, PLAQUE.r);
    // 걸이(금속 못 + 고리)
    g.fillStyle(KITCHEN_STYLE.hook, 1);
    g.fillCircle(0, -ph / 2 + 12, 5);
    g.lineStyle(4, KITCHEN_STYLE.hook, 1);
    g.lineBetween(0, -ph / 2 + 12, 0, -ph / 2 + 26);
    if (this.hint) {
      g.lineStyle(4, 0x9be564, 0.95);
      g.strokeRoundedRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8, PLAQUE.r + 4);
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
    // 반구형 뚜껑 — 2톤(테두리 셰이드) + 웜브라운 외곽선 + 광택
    g.fillStyle(darken(ITEM_STYLE.lid), 1);
    g.beginPath();
    g.arc(0, r * 0.35, r, Math.PI, 0, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(ITEM_STYLE.lid, 1);
    g.beginPath();
    g.arc(0, r * 0.32, r * 0.88, Math.PI, 0, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(-r * 0.3, -r * 0.12, r * 0.46, r * 0.24);
    // 외곽선 — 돔 곡선 + 밑단 한 붓에 (closePath로 현까지 두른다)
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.beginPath();
    g.arc(0, r * 0.35, r, Math.PI, 0, false);
    g.closePath();
    g.strokePath();
    // 나무 손잡이 — 기둥 + 통통한 옹이 + 하이라이트 (v3: 나무색)
    g.fillStyle(ITEM_STYLE.lidKnob, 1);
    g.fillRect(-r * 0.07, -r * 0.66, r * 0.14, r * 0.14);
    g.fillEllipse(0, -r * 0.72, r * 0.46, r * 0.36);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeEllipse(0, -r * 0.72, r * 0.46, r * 0.36);
    g.fillStyle(lighten(ITEM_STYLE.lidKnob, 0.45), 1);
    g.fillEllipse(-r * 0.08, -r * 0.78, r * 0.16, r * 0.09);
  }

  private drawTorch(g: Phaser.GameObjects.Graphics, r: number): void {
    // 화살표로 오독되지 않게: 막대 + 금속 컵 + 둥근 물방울형 불꽃 (서빙 힌트 화살표와 실루엣 분리)
    // 막대(나무) — 외곽선 + 결 하이라이트
    g.fillStyle(ITEM_STYLE.torchStick, 1);
    g.fillRect(-r * 0.14, 0, r * 0.28, r);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeRect(-r * 0.14, 0, r * 0.28, r);
    g.fillStyle(lighten(ITEM_STYLE.torchStick, 0.35), 1);
    g.fillRect(-r * 0.06, r * 0.08, r * 0.06, r * 0.84);
    // 금속 컵 (사다리꼴) — 상단 하이라이트 + 외곽선
    g.fillStyle(ITEM_STYLE.lidEdge, 1);
    g.beginPath();
    g.moveTo(-r * 0.3, -r * 0.1);
    g.lineTo(r * 0.3, -r * 0.1);
    g.lineTo(r * 0.2, r * 0.14);
    g.lineTo(-r * 0.2, r * 0.14);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokePath();
    g.fillStyle(lighten(ITEM_STYLE.lidEdge, 0.3), 1);
    g.fillRect(-r * 0.26, -r * 0.08, r * 0.52, r * 0.06);
    // 둥근 물방울 불꽃 — 외곽선을 두르기 위해 타원+삼각형 대신 한 붓 폴리곤
    g.fillStyle(ITEM_STYLE.torchFlame, 1);
    g.beginPath();
    g.moveTo(0, -r * 1.06);
    g.lineTo(r * 0.17, -r * 0.85);
    g.lineTo(r * 0.31, -r * 0.6);
    g.lineTo(r * 0.29, -r * 0.35);
    g.lineTo(r * 0.16, -r * 0.16);
    g.lineTo(0, -r * 0.12);
    g.lineTo(-r * 0.16, -r * 0.16);
    g.lineTo(-r * 0.29, -r * 0.35);
    g.lineTo(-r * 0.31, -r * 0.6);
    g.lineTo(-r * 0.17, -r * 0.85);
    g.closePath();
    g.fillPath();
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    g.strokePath();
    // 노란 심 + 불꽃 글린트 (v3: 반짝)
    g.fillStyle(ITEM_STYLE.torchFlameCore, 1);
    g.fillEllipse(0, -r * 0.4, r * 0.3, r * 0.44);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-r * 0.08, -r * 0.62, r * 0.06);
  }

  private drawSword(g: Phaser.GameObjects.Graphics, r: number): void {
    // 검신 — 웜브라운 외곽선을 아래 깔고 금속 본체 + 날 하이라이트
    g.lineStyle(5 + OUTLINE.prop * 2, OUTLINE.color, 1);
    g.lineBetween(-r * 0.6, r * 0.7, r * 0.7, -r * 0.75);
    g.lineStyle(5, ITEM_STYLE.sword, 1);
    g.lineBetween(-r * 0.6, r * 0.7, r * 0.7, -r * 0.75);
    g.lineStyle(2, lighten(ITEM_STYLE.sword, 0.35), 1);
    g.lineBetween(-r * 0.58, r * 0.66, r * 0.68, -r * 0.76);
    // 가드 — 같은 방식의 외곽선 + 금색 본체
    g.lineStyle(5 + OUTLINE.prop * 2, OUTLINE.color, 1);
    g.lineBetween(-r * 0.75, r * 0.35, -r * 0.2, r * 0.8);
    g.lineStyle(5, ITEM_STYLE.swordGuard, 1);
    g.lineBetween(-r * 0.75, r * 0.35, -r * 0.2, r * 0.8);
    g.lineStyle(2, lighten(ITEM_STYLE.swordGuard, 0.35), 1);
    g.lineBetween(-r * 0.73, r * 0.34, -r * 0.24, r * 0.74);
    // 손잡이 끝 포멜 — 2톤 + 외곽선 + 글린트
    g.fillStyle(ITEM_STYLE.swordGuard, 1);
    g.fillCircle(-r * 0.62, r * 0.72, r * 0.14);
    g.lineStyle(3, OUTLINE.color, 1);
    g.strokeCircle(-r * 0.62, r * 0.72, r * 0.14);
    g.fillStyle(lighten(ITEM_STYLE.swordGuard, 0.4), 1);
    g.fillCircle(-r * 0.65, r * 0.69, r * 0.05);
  }

  private drawShield(g: Phaser.GameObjects.Graphics, r: number): void {
    // 방패 (decoy) — 오각 방패 2톤 + 계란 문양 (유머: "계란 기사단" 문장)
    const path = () => {
      g.beginPath();
      g.moveTo(0, -r * 0.9);
      g.lineTo(r * 0.8, -r * 0.5);
      g.lineTo(r * 0.6, r * 0.85);
      g.lineTo(0, r);
      g.lineTo(-r * 0.6, r * 0.85);
      g.lineTo(-r * 0.8, -r * 0.5);
      g.closePath();
    };
    g.fillStyle(ITEM_STYLE.shield, 1);
    path();
    g.fillPath();
    // 하단 셰이드 — 아랫단만 어둡게 (2톤, 측면 기울기에 맞춘 밴드)
    g.fillStyle(darken(ITEM_STYLE.shield), 1);
    g.beginPath();
    g.moveTo(-r * 0.65, r * 0.5);
    g.lineTo(r * 0.65, r * 0.5);
    g.lineTo(r * 0.6, r * 0.85);
    g.lineTo(0, r);
    g.lineTo(-r * 0.6, r * 0.85);
    g.closePath();
    g.fillPath();
    // 상단 하이라이트
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(-r * 0.16, -r * 0.5, r * 0.7, r * 0.3);
    // 외곽선
    g.lineStyle(OUTLINE.prop, OUTLINE.color, 1);
    path();
    g.strokePath();
    // 계란 문양 — 흰 타원 + 노른자 원 + 글린트 (보스 대신, 유머 포인트)
    g.fillStyle(PALETTE.white, 1);
    g.fillEllipse(0, r * 0.02, r * 0.8, r * 0.68);
    g.lineStyle(3, OUTLINE.color, 0.9);
    g.strokeEllipse(0, r * 0.02, r * 0.8, r * 0.68);
    g.fillStyle(PALETTE.yolk, 1);
    g.fillCircle(0, r * 0.02, r * 0.2);
    g.lineStyle(3, OUTLINE.color, 0.9);
    g.strokeCircle(0, r * 0.02, r * 0.2);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-r * 0.06, -r * 0.04, r * 0.05);
  }

  destroy(): void {
    this.g.destroy();
    this.zone.destroy();
  }
}
