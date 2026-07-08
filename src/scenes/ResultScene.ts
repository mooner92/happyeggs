import Phaser from 'phaser';
import { DESIGN, TEXT } from '../data/layout';
import { css, PALETTE, SCORE_TEXT } from '../data/palette';
import type { FailReason, StageStatus } from '../systems/stage';

interface ResultData {
  status?: StageStatus;
  reason?: FailReason;
  average?: number;
  served?: number;
  failed?: number;
}

/**
 * 결과 화면 (M1 요약). 후라이 배열·카운트업·별점·PNG 공유는 M3.
 * placeholder UI는 ASCII만 — 기기 한글 폰트 미탑재 두부(□) 방지 ([ADR-0009]·[M0 §12]).
 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    const cx = DESIGN.width / 2;
    const cy = DESIGN.height / 2;

    const cleared = data.status === 'CLEARED';
    const title = cleared
      ? 'STAGE CLEAR!'
      : data.status === 'FAILED'
        ? `STAGE FAILED (${data.reason ?? 'quit'})`
        : 'RESULT (M0 stub)';
    const color = cleared ? SCORE_TEXT.good : data.status === 'FAILED' ? SCORE_TEXT.bad : css(PALETTE.white);

    this.add
      .text(cx, cy - 70, title, { fontSize: TEXT.resultSize, color, fontStyle: 'bold' })
      .setOrigin(0.5);

    if (data.status) {
      const avg = (data.average ?? 0).toFixed(3);
      const served = data.served ?? 0;
      const failed = data.failed ?? 0;
      this.add
        .text(cx, cy, `avg ${avg}   served ${served}   failed ${failed}`, {
          fontFamily: 'monospace',
          fontSize: TEXT.hudSize,
          color: css(PALETTE.white),
        })
        .setOrigin(0.5);
    }

    this.add
      .text(cx, cy + 90, 'tap to restart', {
        fontSize: TEXT.buttonSize,
        color: css(PALETTE.white),
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
