import Phaser from 'phaser';
import { DEPTH, DESIGN, FONT, TEXT } from '../data/layout';
import {
  COUNTER_STYLE,
  css,
  CUSTOMER_STYLE,
  PALETTE,
  RESULT_STYLE,
  SCORE_TEXT,
  WALL_GRADIENT,
  YOLK_STYLE,
} from '../data/palette';
import { loadSave, type KVStorage } from '../systems/save';
import { sfx } from '../ui/audio';
import { addSoftShadow } from '../ui/textures';

/** 타이틀 화면 표현 값 — 화면 높이 대비 비율 앵커 (ShopScene CARD와 같은 계열의 인라인 표현 값) */
const TITLE = {
  logoYRatio: 0.17,
  subYRatio: 0.245,
  /** 마스코트 중심 — 카운터 윗면에 올라앉은 느낌 */
  mascotYRatio: 0.48,
  /** 카운터 나무 밴드 윗면 (게임 씬보다 낮게 — 무대 배경용) */
  counterTopRatio: 0.56,
  startYRatio: 0.68,
  shopYRatio: 0.78,
  progressYRatio: 0.865,
  /** 마스코트 살랑임 진폭 px / 반주기 ms (yoyo로 2초 주기) */
  bobPx: 14,
  bobHalfMs: 1000,
} as const;

/**
 * 타이틀 씬 (디자인 v2) — 로고 + 살랑이는 계란 마스코트 + 시작/상점 버튼 + 진행 요약.
 * 배경·칩 버튼·페이드 전환은 Shop/Result 씬과 같은 문법으로 톤을 통일한다.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => sfx.unlock()); // 오디오 정책 해제 (M6)
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.cameras.main.fadeIn(280, 0, 0, 0);
    const cx = DESIGN.width / 2;

    this.drawBackdrop(cx);
    this.drawLogo(cx);
    this.drawMascot(cx, DESIGN.height * TITLE.mascotYRatio);

    // 버튼 — 세로 2개: 시작(크게) / 상점(보통)
    this.button(cx, DESIGN.height * TITLE.startYRatio, '시작', SCORE_TEXT.good, 260, 84, '40px', () =>
      this.fadeTo('Game'),
    );
    this.button(cx, DESIGN.height * TITLE.shopYRatio, '상점', '#f5c542', 210, 64, TEXT.buttonSize, () =>
      this.fadeTo('Shop'),
    );

    this.drawProgress(cx, DESIGN.height * TITLE.progressYRatio);
  }

  /** 배경 — 벽 그라데이션 + 하단 카운터 나무 밴드 + 비네트 (씬 톤 통일) */
  private drawBackdrop(cx: number): void {
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(WALL_GRADIENT.top, WALL_GRADIENT.top, PALETTE.bg, PALETTE.bg, 1);
    bg.fillRect(0, 0, DESIGN.width, DESIGN.height);

    // 카운터 나무 밴드 — 앞면 + 윗면 + 립 (KitchenView 카운터 문법)
    const counterTop = DESIGN.height * TITLE.counterTopRatio;
    bg.fillStyle(COUNTER_STYLE.front, 1);
    bg.fillRect(0, counterTop, DESIGN.width, DESIGN.height - counterTop);
    bg.fillStyle(COUNTER_STYLE.top, 1);
    bg.fillRect(0, counterTop, DESIGN.width, 28);
    bg.fillStyle(COUNTER_STYLE.lip, 1);
    bg.fillRect(0, counterTop, DESIGN.width, 4);

    this.add
      .image(cx, DESIGN.height / 2, 'vignette')
      .setDisplaySize(DESIGN.width, DESIGN.height)
      .setDepth(500);
  }

  /** 로고 — 노른자색 대문자 + 두꺼운 그림자 + 살짝 기울기, 아래 한 줄 부제 */
  private drawLogo(cx: number): void {
    this.add
      .text(cx, DESIGN.height * TITLE.logoYRatio, 'EGG FLIP', {
        fontFamily: FONT.ui,
        fontSize: '92px',
        color: css(YOLK_STYLE.fill),
      })
      .setOrigin(0.5)
      .setAngle(-4)
      .setShadow(0, 8, '#000000', 12, false, true);
    this.add
      .text(cx, DESIGN.height * TITLE.subYRatio, '완벽한 원에 도전!', {
        fontFamily: FONT.ui,
        fontSize: '28px',
        color: css(PALETTE.white),
      })
      .setOrigin(0.5)
      .setShadow(0, 3, '#000000', 6, false, true);
  }

  /** 마스코트 — 절차적 후라이(흰자+투톤 노른자+광점+점 눈/미소)가 위아래로 살랑인다 */
  private drawMascot(cx: number, cy: number): void {
    // 접지 그림자 — 카운터 윗면에 고정 (마스코트만 살랑임)
    addSoftShadow(this, cx, cy + 96, 300, 84, -5, 0.4);

    const mascot = this.add.container(cx, cy).setDepth(0);
    const g = this.add.graphics();
    mascot.add(g);

    // 흰자 + 투톤 노른자 (ShopScene 미니 후라이 프리뷰의 확대판)
    g.fillStyle(PALETTE.white, 1);
    g.fillEllipse(0, 0, 280, 180);
    g.fillStyle(YOLK_STYLE.fill, 1);
    g.fillEllipse(0, -6, 112, 86);
    g.fillStyle(YOLK_STYLE.edge, 0.35); // 아랫면 음영 — 노른자 투톤
    g.fillEllipse(0, 10, 92, 44);
    g.lineStyle(5, YOLK_STYLE.edge, 1);
    g.strokeEllipse(0, -6, 112, 86);
    g.fillStyle(YOLK_STYLE.highlight, 0.85);
    g.fillEllipse(-20, -26, 38, 24);

    // 점 눈 + 미소 (QueueView 손님 얼굴 문법)
    g.fillStyle(CUSTOMER_STYLE.face, 1);
    g.fillCircle(-22, -12, 6);
    g.fillCircle(22, -12, 6);
    g.lineStyle(5, CUSTOMER_STYLE.face, 1);
    g.beginPath();
    g.arc(0, -4, 16, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();

    // 살랑임 — yoyo 2초 주기
    this.tweens.add({
      targets: mascot,
      y: cy - TITLE.bobPx,
      duration: TITLE.bobHalfMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 갓 구운 스팀 — 마스코트 위에서 은은하게 피어오름 (800ms 간격)
    this.add
      .particles(cx, cy - 96, 'steam', {
        lifespan: 1400,
        frequency: 800,
        quantity: 1,
        speedY: { min: -60, max: -36 },
        speedX: { min: -12, max: 12 },
        scale: { start: 0.5, end: 1.2 },
        alpha: { start: 0.35, end: 0 },
      })
      .setDepth(1);
  }

  /** 진행 요약 — 스테이지별 최고 별 합계 + 코인. 저장 접근 실패 시 표시 생략 */
  private drawProgress(cx: number, y: number): void {
    try {
      const save = loadSave(window.localStorage as unknown as KVStorage);
      const stars = Object.values(save.stages).reduce((sum, r) => sum + r.bestStars, 0);
      this.add
        .text(cx, y, `★ ${stars}   코인 ${save.coins}`, {
          fontFamily: FONT.ui,
          fontSize: TEXT.hudSize,
          color: css(RESULT_STYLE.plateShade),
        })
        .setOrigin(0.5);
    } catch {
      /* localStorage 접근 불가(프라이버시 모드 등) — 진행 표시는 비필수라 생략 */
    }
  }

  /** 페이드 아웃 후 씬 전환 (Result/Shop 씬과 동일한 전환 문법) */
  private fadeTo(key: string): void {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start(key),
    );
  }

  /** 칩 버튼 — 라운드 반투명 배경 + 탭 스쿼시 (ResultScene.button 확장: 크기 가변) */
  private button(
    x: number,
    y: number,
    label: string,
    color: string,
    w: number,
    h: number,
    fontSize: string,
    onTap: () => void,
  ): void {
    const chip = this.add.graphics().setDepth(DEPTH.hud - 1);
    chip.fillStyle(0x000000, 0.35);
    chip.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
    chip.lineStyle(2, 0xffffff, 0.09);
    chip.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);
    const t = this.add
      .text(x, y, label, { fontFamily: FONT.ui, fontSize, color })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        sfx.play('ui_tap');
        this.tweens.add({ targets: t, scale: 0.92, duration: 70, yoyo: true });
        onTap();
      });
  }
}
