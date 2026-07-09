import Phaser from 'phaser';
import { generateProcTextures } from '../ui/textures';

/** 최소 초기화 — 절차적 텍스처(그림자·광택·스팀) 생성 + 게임 폰트 로드 후 Preload로 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateProcTextures(this);
    // Jua 폰트(디자인 v2) — 로드 완료 후 씬 시작해야 첫 텍스트부터 적용된다.
    // 실패(오프라인 캐시 등)해도 진행 — 폴백 폰트로 표시.
    let started = false;
    const start = (): void => {
      if (started) return; // 폰트 완료·타임아웃 경합 중복 시작 방지
      started = true;
      this.scene.start('Preload');
    };
    try {
      void document.fonts.load('16px Jua').then(start, start);
      this.time.delayedCall(1500, start); // 안전망 — 폰트가 늦어도 1.5초 후엔 시작
    } catch {
      start();
    }
  }
}
