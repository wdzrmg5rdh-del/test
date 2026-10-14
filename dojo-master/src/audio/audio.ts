import type { SoundId } from '../core/events';

/**
 * Prozedurale Soundeffekte über die Web-Audio-API im Stil später
 * 80er-Heimcomputer: einfache Wellenformen, Rauschen, kurze Hüllkurven.
 *
 * Browser erlauben Audio erst nach einer Nutzerinteraktion. Der AudioContext
 * wird deshalb erst beim ersten Tastendruck bzw. Klick erzeugt (unlock()).
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private volume = 0.6;
  private muted = false;

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Muss aus einem Tastatur- oder Mausereignis heraus aufgerufen werden. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.applyVolume();
        const len = Math.floor(this.ctx.sampleRate * 1);
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        // Rauschen wie ein 8-Bit-Rauschgenerator: grob quantisiert
        for (let i = 0; i < len; i++) d[i] = Math.round((Math.random() * 2 - 1) * 8) / 8;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolume();
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.5;
  }

  play(ids: readonly SoundId[]): void {
    if (!this.ctx || !this.master || this.muted || this.ctx.state !== 'running') return;
    for (const id of ids) {
      try {
        this.synth(id);
      } catch {
        /* einzelner Effekt fehlgeschlagen – ignorieren */
      }
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filter: BiquadFilterType, f0: number, f1: number, q = 1, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = filter;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private synth(id: SoundId): void {
    switch (id) {
      case 'schlagLuft':
        this.noise(0.07, 0.25, 'bandpass', 2400, 900, 1.2);
        break;
      case 'trittLuft':
        this.noise(0.12, 0.3, 'bandpass', 1500, 400, 1);
        break;
      case 'trefferLeicht':
        this.tone('square', 240, 90, 0.09, 0.35);
        this.noise(0.05, 0.4, 'lowpass', 3000, 800);
        break;
      case 'trefferSchwer':
        this.tone('square', 170, 45, 0.2, 0.45);
        this.noise(0.14, 0.5, 'lowpass', 2500, 300);
        break;
      case 'abwehr':
        this.tone('square', 1250, 1150, 0.05, 0.25);
        this.tone('triangle', 620, 600, 0.08, 0.3);
        this.noise(0.03, 0.3, 'highpass', 3000, 3000);
        break;
      case 'aufprall':
        this.noise(0.22, 0.55, 'lowpass', 600, 80);
        this.tone('sine', 90, 40, 0.2, 0.5);
        break;
      case 'sprung':
        this.tone('square', 180, 420, 0.1, 0.12);
        break;
      case 'landung':
        this.noise(0.06, 0.3, 'lowpass', 500, 150);
        break;
      case 'rundenbeginn':
        this.tone('triangle', 196, 194, 1.3, 0.45);
        this.tone('triangle', 198, 196, 1.3, 0.3);
        this.tone('square', 392, 392, 0.12, 0.12);
        this.noise(0.04, 0.3, 'highpass', 4000, 4000);
        break;
      case 'rundenende':
        [784, 659, 523, 392].forEach((f, i) => this.tone('square', f, f, 0.14, 0.18, i * 0.12));
        break;
      case 'punkt':
        this.tone('square', 660, 660, 0.07, 0.18);
        this.tone('square', 990, 990, 0.1, 0.18, 0.07);
        break;
      case 'ballAbgewehrt':
        this.tone('square', 880, 1320, 0.08, 0.22);
        this.noise(0.03, 0.25, 'highpass', 2500, 2500);
        break;
      case 'ballVerfehlt':
        this.tone('square', 320, 120, 0.22, 0.25);
        break;
      case 'bombe':
        this.noise(0.7, 0.7, 'lowpass', 1800, 60, 0.8);
        this.tone('sine', 80, 30, 0.6, 0.5);
        break;
      case 'guertel':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('square', f, f, 0.1, 0.18, i * 0.08));
        break;
      case 'menue':
        this.tone('square', 1000, 1000, 0.03, 0.12);
        break;
      case 'menueBestaetigen':
        this.tone('square', 660, 660, 0.05, 0.15);
        this.tone('square', 1320, 1320, 0.07, 0.15, 0.05);
        break;
      case 'schritt':
        this.noise(0.02, 0.06, 'bandpass', 900, 900, 2);
        break;
      case 'zeit':
        this.tone('square', 1200, 1200, 0.06, 0.15);
        break;
    }
  }
}
