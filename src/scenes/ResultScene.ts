import Phaser from 'phaser';
import { STAGES } from '../data/stages';
import { sfx } from '../ui/audio';
import { DEPTH, DESIGN, TEXT } from '../data/layout';
import { css, PALETTE, RESULT_STYLE, SCORE_TEXT, WALL_GRADIENT, YOLK_STYLE } from '../data/palette';
import type { FailReason, StageStatus } from '../systems/stage';
import type { Stars } from '../systems/stars';

interface ResultData {
  status?: StageStatus;
  reason?: FailReason;
  stageId?: string;
  average?: number;
  best?: number;
  stars?: Stars;
  scores?: number[];
  served?: number;
  failed?: number;
  /** 이번 스테이지 벌이 / 지갑 총액 (ADR-0011 코인 경제) */
  coinsEarned?: number;
  coinsTotal?: number;
}

/**
 * 결과 화면 (GDD §11) — 접시 위 후라이 배열 + 별점 팝인 + 점수 카운트업 + PNG 공유.
 * placeholder UI는 ASCII만 (한글 폰트 두부 방지, ADR-0009).
 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => sfx.unlock()); // 오디오 정책 해제 (M6)
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    this.cameras.main.fadeIn(280, 0, 0, 0); // 부드러운 진입 (디자인 v1)
    const cx = DESIGN.width / 2;
    const cleared = data.status === 'CLEARED';
    const avg = data.average ?? 0;
    const stageId = data.stageId ?? 'stage';

    // 배경 — 주방과 같은 벽 그라데이션 + 비네트 (디자인 v1, 씬 톤 통일)
    const bg = this.add.graphics().setDepth(-10);
    bg.fillGradientStyle(WALL_GRADIENT.top, WALL_GRADIENT.top, PALETTE.bg, PALETTE.bg, 1);
    bg.fillRect(0, 0, DESIGN.width, DESIGN.height);
    this.add
      .image(cx, DESIGN.height / 2, 'vignette')
      .setDisplaySize(DESIGN.width, DESIGN.height)
      .setDepth(500);

    // 타이틀 (그림자로 무게감)
    const title = cleared
      ? 'STAGE CLEAR!'
      : data.status === 'FAILED'
        ? `STAGE FAILED (${data.reason ?? 'quit'})`
        : 'RESULT';
    this.add
      .text(cx, DESIGN.height * 0.13, title, {
        fontSize: TEXT.resultSize,
        color: cleared ? SCORE_TEXT.good : SCORE_TEXT.bad,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, '#000000', 8, false, true);

    // 접시 + 후라이 배열
    this.drawPlate(cx, DESIGN.height * 0.38, data.scores ?? []);

    // 별점 (팝인)
    this.drawStars(cx, DESIGN.height * 0.62, data.stars ?? 0);

    // 점수 카운트업
    const scoreText = this.add
      .text(cx, DESIGN.height * 0.71, 'avg 0.000', {
        fontFamily: 'monospace',
        fontSize: TEXT.resultSize,
        color: css(PALETTE.white),
      })
      .setOrigin(0.5);
    this.tweens.addCounter({
      from: 0,
      to: avg,
      delay: 250,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => scoreText.setText(`avg ${(tw.getValue() ?? 0).toFixed(3)}`),
    });
    this.add
      .text(
        cx,
        DESIGN.height * 0.76,
        `best ${(data.best ?? avg).toFixed(3)}   served ${data.served ?? 0}   failed ${data.failed ?? 0}`,
        { fontFamily: 'monospace', fontSize: TEXT.hudSize, color: css(RESULT_STYLE.plateShade) },
      )
      .setOrigin(0.5);

    // 코인 정산 — 이번 벌이 + 지갑 총액 (ADR-0011 GPGP식 영업 정산)
    if ((data.coinsEarned ?? 0) > 0 || (data.coinsTotal ?? 0) > 0) {
      this.add
        .text(
          cx,
          DESIGN.height * 0.805,
          `+${data.coinsEarned ?? 0} coins   (wallet ${data.coinsTotal ?? 0})`,
          { fontFamily: 'monospace', fontSize: TEXT.hudSize, color: '#f5c542' },
        )
        .setOrigin(0.5);
    }

    // 버튼 2줄 (칩 배경): [SHARE][RETRY] / [SHOP][NEXT(클리어+다음 스테이지 존재 시)]
    const y1 = DESIGN.height * 0.855;
    const y2 = DESIGN.height * 0.935;
    this.button(cx - 130, y1, 'SHARE', SCORE_TEXT.good, () => this.shareResult(stageId, avg));
    this.button(cx + 130, y1, 'RETRY ▸', css(PALETTE.white), () =>
      this.fadeTo('Game', { stageId }),
    );
    this.button(cx - 130, y2, 'SHOP', '#f5c542', () => this.fadeTo('Shop'));
    // 다음 스테이지 진행 (M5) — 클리어 시에만
    const nextIdx = STAGES.findIndex((s) => s.id === stageId) + 1;
    const next = cleared && nextIdx > 0 ? STAGES[nextIdx] : undefined;
    if (next) {
      this.button(cx + 130, y2, 'NEXT ▸', SCORE_TEXT.good, () =>
        this.fadeTo('Game', { stageId: next.id }),
      );
    }
  }

  /** 페이드 아웃 후 씬 전환 (디자인 v1) */
  private fadeTo(key: string, data?: object): void {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start(key, data),
    );
  }

  private button(x: number, y: number, label: string, color: string, onTap: () => void): void {
    // 칩 배경 — 라운드 반투명 (디자인 v1, 탭 타겟을 도형으로 보여준다)
    const chip = this.add.graphics().setDepth(DEPTH.hud - 1);
    chip.fillStyle(0x000000, 0.35);
    chip.fillRoundedRect(x - 105, y - 32, 210, 64, 20);
    chip.lineStyle(2, 0xffffff, 0.09);
    chip.strokeRoundedRect(x - 105, y - 32, 210, 64, 20);
    const t = this.add
      .text(x, y, label, { fontSize: TEXT.buttonSize, color })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        sfx.play('ui_tap');
        onTap();
      });
    // 탭 스쿼시 피드백
    t.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.tweens.add({ targets: t, scale: 0.92, duration: 70, yoyo: true });
    });
  }

  private drawPlate(cx: number, cy: number, scores: number[]): void {
    const g = this.add.graphics();
    const rx = DESIGN.width * 0.36;
    const ry = rx * 0.62;
    // 접시 그림자 + 접시
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cx, cy + 14, rx * 2.05, ry * 2.05);
    g.fillStyle(RESULT_STYLE.plateEdge, 1);
    g.fillEllipse(cx, cy, rx * 2, ry * 2);
    g.fillStyle(RESULT_STYLE.plate, 1);
    g.fillEllipse(cx, cy, rx * 1.72, ry * 1.72);
    g.fillStyle(RESULT_STYLE.plateShade, 1);
    g.fillEllipse(cx, cy, rx * 1.5, ry * 1.5);

    // 후라이 배열 — 접시 위에 격자 배치
    const n = Math.max(scores.length, 0);
    if (n === 0) return;
    const cols = Math.min(n, 3);
    const rows = Math.ceil(n / cols);
    const gapX = rx * 0.85;
    const gapY = ry * 0.8;
    for (let i = 0; i < n; i++) {
      const r = i % cols;
      const rowIdx = Math.floor(i / cols);
      const ex = cx + (r - (cols - 1) / 2) * gapX;
      const ey = cy + (rowIdx - (rows - 1) / 2) * gapY;
      this.drawMiniFry(g, ex, ey, 34, scores[i]!);
    }
  }

  private drawMiniFry(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, score: number): void {
    // 점수가 낮을수록 덜 둥글게(가로로 눌러) 표현
    const round = Phaser.Math.Clamp(score / 100, 0.4, 1);
    const sq = 0.62;
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(x, y + r * 0.5 * sq, r * 2.1 * round, r * 1.1 * sq);
    g.fillStyle(PALETTE.white, 1);
    g.fillEllipse(x, y, r * 2 * round, r * 2 * sq);
    g.fillStyle(YOLK_STYLE.fill, 1);
    g.fillEllipse(x, y, r * 0.9, r * 0.9 * sq);
    g.fillStyle(YOLK_STYLE.highlight, 0.85);
    g.fillEllipse(x - r * 0.16, y - r * 0.14 * sq, r * 0.34, r * 0.28 * sq);
  }

  private drawStars(cx: number, cy: number, stars: Stars): void {
    const gap = 92;
    for (let i = 0; i < 3; i++) {
      const on = i < stars;
      const sx = cx + (i - 1) * gap;
      const g = this.add.graphics().setPosition(sx, cy);
      this.drawStar(g, on);
      if (on) {
        g.setScale(0);
        this.tweens.add({
          targets: g,
          scale: 1,
          delay: 400 + i * 160,
          duration: 340,
          ease: 'Back.easeOut',
          onStart: () => sfx.play('star'),
        });
      }
    }
  }

  private drawStar(g: Phaser.GameObjects.Graphics, on: boolean): void {
    const R = 34;
    const r = 15;
    const points: Phaser.Geom.Point[] = [];
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / 5;
      const rad = k % 2 === 0 ? R : r;
      points.push(new Phaser.Geom.Point(Math.cos(ang) * rad, Math.sin(ang) * rad));
    }
    g.fillStyle(on ? RESULT_STYLE.starOn : RESULT_STYLE.starOff, 1);
    g.fillPoints(points, true);
    g.lineStyle(3, on ? RESULT_STYLE.starEdge : 0x2b2620, 1);
    g.strokePoints(points, true, true);
  }

  /** 결과 화면 스냅샷 → PNG → Web Share(미지원 시 다운로드). 파일명 GDD §11 규칙 */
  private shareResult(stageId: string, avg: number): void {
    const filename = `eggflip_${stageId}_${avg.toFixed(3)}.png`;
    this.game.renderer.snapshot((snap) => {
      const img = snap as HTMLImageElement;
      const dataUrl = img.src;
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (typeof nav.share === 'function') {
        fetch(dataUrl)
          .then((r) => r.blob())
          .then((blob) => {
            const file = new File([blob], filename, { type: 'image/png' });
            if (nav.canShare?.({ files: [file] })) {
              nav.share({ files: [file], title: 'EGG FLIP' }).catch(() => this.downloadPng(dataUrl, filename));
            } else {
              this.downloadPng(dataUrl, filename);
            }
          })
          .catch(() => this.downloadPng(dataUrl, filename));
      } else {
        this.downloadPng(dataUrl, filename);
      }
    });
  }

  private downloadPng(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
