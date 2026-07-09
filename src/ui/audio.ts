// 절차적 SFX (M6, ADR-0009 연장) — WebAudio 오실레이터/노이즈 합성. 에셋·번들 0.
// 모바일 자동재생 정책: 첫 사용자 제스처에서 unlock()으로 AudioContext 생성/재개.
// 실제 오디오 에셋 교체 시 play() 스위치만 스왑하면 된다(키는 유지).

/** 게임 전역 SFX 키 — 훅 지점의 어휘 */
export type SfxKey =
  | 'crack'
  | 'flip_whoosh'
  | 'land_clean'
  | 'land_fold'
  | 'fly_off'
  | 'serve'
  | 'coin'
  | 'push'
  | 'telegraph'
  | 'event_success'
  | 'event_fail'
  | 'fire_out'
  | 'reignite'
  | 'sprinkler'
  | 'stage_clear'
  | 'game_over'
  | 'ui_tap'
  | 'buy'
  | 'denied'
  | 'star';

const MASTER_GAIN = 0.22;

/**
 * 싱글턴 SFX 엔진 — 씬 어디서든 sfx.play(key). QA는 window.__sfxLog로 발화 검증.
 * AudioContext 미지원/차단 환경에서는 조용히 no-op (게임플레이 무영향).
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** QA/디버그 — 최근 재생 키 링 버퍼 */
  readonly log: string[] = [];

  /** 첫 사용자 제스처에서 호출 (idempotent) — 자동재생 정책 해제 */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_GAIN;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // 미지원 환경 — 이후 play는 전부 no-op
    }
  }

  play(key: SfxKey): void {
    this.log.push(key);
    if (this.log.length > 64) this.log.shift();
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    try {
      this.synth(ctx, key);
    } catch {
      /* 합성 실패 무시 — 사운드는 항상 비필수 */
    }
  }

  // ── 합성 프리미티브 ──

  /** 단음 — 주파수 스윕 + 지수 감쇠 */
  private tone(
    ctx: AudioContext,
    type: OscillatorType,
    f0: number,
    f1: number,
    durSec: number,
    gain = 1,
    delaySec = 0,
  ): void {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + durSec);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + durSec + 0.02);
  }

  /** 노이즈 버스트 — 로우패스 필터로 질감 조절 */
  private noise(ctx: AudioContext, durSec: number, filterHz: number, gain = 1, delaySec = 0): void {
    const t0 = ctx.currentTime + delaySec;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durSec));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t0);
  }

  /** 키별 레시피 — Bacon 톤: 짧고 둥글고 귀엽게 */
  private synth(ctx: AudioContext, key: SfxKey): void {
    switch (key) {
      case 'crack':
        this.noise(ctx, 0.08, 2600, 0.9);
        this.tone(ctx, 'sine', 180, 70, 0.09, 0.8);
        break;
      case 'flip_whoosh':
        this.tone(ctx, 'triangle', 260, 880, 0.18, 0.5);
        break;
      case 'land_clean':
        this.tone(ctx, 'sine', 150, 90, 0.1, 0.9);
        this.noise(ctx, 0.05, 1800, 0.4, 0.01);
        break;
      case 'land_fold':
        this.tone(ctx, 'sine', 120, 60, 0.16, 0.9);
        break;
      case 'fly_off':
        this.tone(ctx, 'triangle', 700, 1500, 0.3, 0.4);
        break;
      case 'serve':
        this.tone(ctx, 'sine', 880, 880, 0.16, 0.6);
        this.tone(ctx, 'sine', 1318, 1318, 0.22, 0.5, 0.07);
        break;
      case 'coin':
        this.tone(ctx, 'square', 1180, 1180, 0.06, 0.35);
        this.tone(ctx, 'square', 1568, 1568, 0.14, 0.35, 0.06);
        break;
      case 'push':
        this.tone(ctx, 'sine', 240, 160, 0.06, 0.6);
        break;
      case 'telegraph':
        this.tone(ctx, 'square', 660, 660, 0.07, 0.3);
        this.tone(ctx, 'square', 660, 660, 0.07, 0.3, 0.12);
        break;
      case 'event_success':
        this.tone(ctx, 'triangle', 660, 660, 0.09, 0.5);
        this.tone(ctx, 'triangle', 990, 990, 0.14, 0.5, 0.08);
        break;
      case 'event_fail':
        this.tone(ctx, 'sawtooth', 160, 110, 0.28, 0.5);
        break;
      case 'fire_out':
        this.tone(ctx, 'triangle', 600, 140, 0.35, 0.5);
        this.noise(ctx, 0.3, 900, 0.5);
        break;
      case 'reignite':
        this.noise(ctx, 0.12, 3200, 0.6);
        this.tone(ctx, 'triangle', 200, 720, 0.22, 0.5, 0.05);
        break;
      case 'sprinkler':
        this.noise(ctx, 0.8, 2400, 0.55);
        break;
      case 'stage_clear':
        this.tone(ctx, 'triangle', 523, 523, 0.12, 0.55);
        this.tone(ctx, 'triangle', 659, 659, 0.12, 0.55, 0.11);
        this.tone(ctx, 'triangle', 784, 784, 0.24, 0.55, 0.22);
        break;
      case 'game_over':
        this.tone(ctx, 'triangle', 392, 392, 0.16, 0.55);
        this.tone(ctx, 'triangle', 311, 311, 0.16, 0.55, 0.15);
        this.tone(ctx, 'triangle', 233, 233, 0.32, 0.55, 0.3);
        break;
      case 'ui_tap':
        this.tone(ctx, 'sine', 520, 440, 0.05, 0.4);
        break;
      case 'buy':
        this.tone(ctx, 'square', 988, 988, 0.07, 0.35);
        this.tone(ctx, 'square', 1318, 1318, 0.07, 0.35, 0.07);
        this.tone(ctx, 'square', 1760, 1760, 0.14, 0.35, 0.14);
        break;
      case 'denied':
        this.tone(ctx, 'sawtooth', 220, 180, 0.09, 0.4);
        this.tone(ctx, 'sawtooth', 220, 180, 0.09, 0.4, 0.11);
        break;
      case 'star':
        this.tone(ctx, 'sine', 1568, 2093, 0.16, 0.4);
        break;
    }
  }
}

export const sfx = new Sfx();

// QA/디버그 — Playwright가 훅 발화를 검증한다 (verify-m6-sfx)
declare global {
  interface Window {
    __sfxLog?: readonly string[];
  }
}
if (typeof window !== 'undefined') window.__sfxLog = sfx.log;
