import Phaser from 'phaser';
import { DEPTH, DESIGN, TEXT } from '../data/layout';
import {
  COIN_STYLE,
  css,
  HINT_STYLE,
  PALETTE,
  SCORE_TEXT,
  WALL_GRADIENT,
  YOLK_STYLE,
} from '../data/palette';
import { DEFAULT_SKIN_ID, SKINS, type SkinDef } from '../data/skins';
import {
  equipSkin,
  loadSave,
  SAVE_SCHEMA_VERSION,
  type KVStorage,
  type SaveData,
} from '../systems/save';
import { buySkin } from '../systems/shop';

/** 카드 그리드 표현 값 (px) — ResultScene 칩과 같은 계열의 인라인 표현 값 */
const CARD = {
  w: 300,
  h: 250,
  r: 20,
  /** 2열 중심 간 가로 간격 */
  colGapX: 330,
  /** 행 중심 간 세로 간격 */
  rowGapY: 280,
  /** 첫 행 중심 y */
  gridTopY: 380,
} as const;

/** localStorage 접근 불가(프라이버시 모드 등) 시 표시용 폴백 — coins 0 · 기본 스킨 */
function fallbackSave(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    stages: {},
    coins: 0,
    ownedSkins: [DEFAULT_SKIN_ID],
    equippedSkin: DEFAULT_SKIN_ID,
  };
}

/**
 * 스킨 상점 (GDD §12 BM — 코스메틱 스킨, ADR-0011 코인 구매).
 * SKINS를 2열 카드 그리드로 표시 — 구매/장착은 systems/shop·save에 위임하고
 * 이 씬은 상태 변화 시에만 다시 그린다(per-frame 재드로우 없음). UI 텍스트는 ASCII만 (ADR-0009).
 */
export class ShopScene extends Phaser.Scene {
  private storage: KVStorage | null = null;
  private save: SaveData = fallbackSave();
  private cards: Phaser.GameObjects.Container[] = [];
  private coinText?: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  create(): void {
    // 저장소 어댑터 — 접근 실패 시 coins 0·기본 스킨으로 표시만 (ResultScene 패턴)
    try {
      this.storage = window.localStorage as unknown as KVStorage;
      this.save = loadSave(this.storage);
    } catch {
      this.storage = null;
      this.save = fallbackSave();
    }

    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.cameras.main.fadeIn(280, 0, 0, 0);
    const cx = DESIGN.width / 2;

    // 배경 — 주방과 같은 벽 그라데이션 + 비네트 (씬 톤 통일)
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(WALL_GRADIENT.top, WALL_GRADIENT.top, PALETTE.bg, PALETTE.bg, 1);
    bg.fillRect(0, 0, DESIGN.width, DESIGN.height);
    this.add
      .image(cx, DESIGN.height / 2, 'vignette')
      .setDisplaySize(DESIGN.width, DESIGN.height)
      .setDepth(500);

    // 타이틀 (그림자로 무게감)
    this.add
      .text(cx, DESIGN.height * 0.09, 'SKIN SHOP', {
        fontSize: TEXT.resultSize,
        color: css(PALETTE.white),
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, '#000000', 8, false, true);

    this.drawWallet();
    this.refresh();
    this.drawPlayButton(cx, DESIGN.height * 0.93);
  }

  /** 우상단 지갑 — 칩 배경 + 금화 아이콘 + 코인 수 (StageHudView 코인 스타일) */
  private drawWallet(): void {
    const x = DESIGN.width - 150;
    const y = DESIGN.height * 0.05;
    const g = this.add.graphics().setDepth(DEPTH.hud - 1);
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x - 34, y - 28, 170, 56, 18);
    g.lineStyle(2, 0xffffff, 0.09);
    g.strokeRoundedRect(x - 34, y - 28, 170, 56, 18);
    this.drawCoinIcon(g, x, y, 14);
    this.coinText = this.add
      .text(x + 26, y, `${this.save.coins}`, {
        fontFamily: 'monospace',
        fontSize: TEXT.buttonSize,
        color: css(COIN_STYLE.fill),
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
  }

  /** 절차적 금화 — 원 + 테두리 + 광점 */
  private drawCoinIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.fillStyle(COIN_STYLE.fill, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(3, COIN_STYLE.edge, 1);
    g.strokeCircle(x, y, r);
    g.fillStyle(COIN_STYLE.shine, 0.9);
    g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.28);
  }

  /** 상태 변화 시에만 전체 카드·지갑을 다시 그린다 */
  private refresh(): void {
    this.coinText?.setText(`${this.save.coins}`);
    for (const c of this.cards) {
      this.tweens.killTweensOf(c);
      c.destroy();
    }
    this.cards = SKINS.map((skin, i) => this.buildCard(skin, i));
  }

  /** 스킨 카드 — 반투명 라운드 칩 + 미니 후라이 프리뷰 + 이름 + 상태줄 */
  private buildCard(skin: SkinDef, index: number): Phaser.GameObjects.Container {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = DESIGN.width / 2 + (col === 0 ? -1 : 1) * (CARD.colGapX / 2);
    const y = CARD.gridTopY + row * CARD.rowGapY;
    const owned = this.save.ownedSkins.includes(skin.id);
    const equipped = this.save.equippedSkin === skin.id;

    const card = this.add.container(x, y);
    const g = this.add.graphics();
    card.add(g);

    // 칩 배경 — 장착 중이면 초록 테두리로 구분
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, CARD.r);
    if (equipped) g.lineStyle(3, HINT_STYLE.accent, 0.95);
    else g.lineStyle(2, 0xffffff, 0.09);
    g.strokeRoundedRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, CARD.r);

    // 미니 후라이 프리뷰 — 스킨 오버라이드 색 반영 (미지정 시 palette 기본값)
    const py = -CARD.h / 2 + 84;
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(0, py + 12, 150, 42);
    g.fillStyle(skin.whiteTint ?? PALETTE.white, 1);
    g.fillEllipse(0, py, 148, 92);
    g.fillStyle(skin.yolkFill ?? YOLK_STYLE.fill, 1);
    g.fillEllipse(0, py, 58, 42);
    g.lineStyle(3, skin.yolkEdge ?? YOLK_STYLE.edge, 1);
    g.strokeEllipse(0, py, 58, 42);
    g.fillStyle(YOLK_STYLE.highlight, 0.85);
    g.fillEllipse(-11, py - 8, 20, 13);

    // 스킨 이름
    card.add(
      this.add
        .text(0, 22, skin.name, {
          fontSize: TEXT.buttonSize,
          color: css(PALETTE.white),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    // 상태줄 — 미보유: 금화+가격 / 보유: OWNED / 장착 중: EQUIPPED
    const sy = CARD.h / 2 - 42;
    if (!owned) {
      this.drawCoinIcon(g, -30, sy, 12);
      card.add(
        this.add
          .text(-12, sy, `${skin.price}`, {
            fontFamily: 'monospace',
            fontSize: TEXT.buttonSize,
            color: css(COIN_STYLE.fill),
          })
          .setOrigin(0, 0.5),
      );
    } else {
      card.add(
        this.add
          .text(0, sy, equipped ? 'EQUIPPED' : 'OWNED', {
            fontFamily: 'monospace',
            fontSize: TEXT.hudSize,
            color: equipped ? SCORE_TEXT.good : SCORE_TEXT.normal,
          })
          .setOrigin(0.5),
      );
    }

    card.setSize(CARD.w, CARD.h);
    card.setInteractive({ useHandCursor: true });
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.onCardTap(skin, card, x));
    return card;
  }

  /** 카드 탭 — 구매/장착/흔들림. 장착 중 카드는 무시 */
  private onCardTap(skin: SkinDef, card: Phaser.GameObjects.Container, baseX: number): void {
    if (this.save.equippedSkin === skin.id) return;
    if (this.save.ownedSkins.includes(skin.id)) {
      // 보유·미장착 → 장착 (저장소 없으면 표시만이므로 무시)
      if (!this.storage) return;
      this.save = equipSkin(this.storage, skin.id);
      this.refresh();
      return;
    }
    // 미보유 → 구매 시도. 잔액 부족(또는 저장소 없음)이면 좌우 흔들림
    const bought = this.storage ? buySkin(this.storage, skin) : null;
    if (bought) {
      this.save = bought;
      this.refresh();
    } else {
      this.shakeCard(card, baseX);
    }
  }

  /** 잔액 부족 피드백 — 카드 좌우 흔들림 (x ±8, 3회) */
  private shakeCard(card: Phaser.GameObjects.Container, baseX: number): void {
    this.tweens.killTweensOf(card);
    card.setX(baseX);
    this.tweens.add({
      targets: card,
      x: { from: baseX - 8, to: baseX + 8 },
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => card.setX(baseX),
    });
  }

  /** 하단 중앙 PLAY 칩 버튼 — 페이드아웃 후 게임 시작 (ResultScene 버튼 패턴) */
  private drawPlayButton(x: number, y: number): void {
    const chip = this.add.graphics().setDepth(DEPTH.hud - 1);
    chip.fillStyle(0x000000, 0.35);
    chip.fillRoundedRect(x - 105, y - 32, 210, 64, 20);
    chip.lineStyle(2, 0xffffff, 0.09);
    chip.strokeRoundedRect(x - 105, y - 32, 210, 64, 20);
    const t = this.add
      .text(x, y, 'PLAY >', { fontSize: TEXT.buttonSize, color: SCORE_TEXT.good })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.tweens.add({ targets: t, scale: 0.92, duration: 70, yoyo: true });
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
          this.scene.start('Game'),
        );
      });
  }
}
