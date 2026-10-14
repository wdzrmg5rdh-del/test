import { CONFIG } from '../config';
import { Surface } from '../render/surface';

/**
 * Bringt den logischen Framebuffer (640 × 360) ganzzahlig skaliert und ohne
 * Kantenglättung auf den Bildschirm. Gerechnet wird in physischen Pixeln
 * (devicePixelRatio), damit die Skalierung auch bei 125 % Systemzoom scharf bleibt.
 */
export class Screen {
  readonly surface: Surface;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private readonly bufferCtx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  scale = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const { width, height } = CONFIG.screen;
    this.surface = new Surface(width, height);
    this.buffer = document.createElement('canvas');
    this.buffer.width = width;
    this.buffer.height = height;
    this.bufferCtx = this.buffer.getContext('2d')!;
    this.image = new ImageData(this.surface.bytes, width, height);
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('fullscreenchange', () => this.resize());
    this.resize();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.scale = Math.max(1, Math.floor(Math.min(w / CONFIG.screen.width, h / CONFIG.screen.height)));
  }

  present(): void {
    this.bufferCtx.putImageData(this.image, 0, 0);
    const { width, height, borderColor } = CONFIG.screen;
    const cw = this.canvas.width, ch = this.canvas.height;
    const dw = width * this.scale, dh = height * this.scale;
    const dx = Math.floor((cw - dw) / 2), dy = Math.floor((ch - dh) / 2);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = borderColor;
    if (dy > 0) {
      ctx.fillRect(0, 0, cw, dy);
      ctx.fillRect(0, dy + dh, cw, ch - dy - dh);
    }
    if (dx > 0) {
      ctx.fillRect(0, dy, dx, dh);
      ctx.fillRect(dx + dw, dy, cw - dx - dw, dh);
    }
    ctx.drawImage(this.buffer, dx, dy, dw, dh);
  }

  static isFullscreen(): boolean {
    return document.fullscreenElement != null;
  }

  /** Schaltet den Vollbildmodus um; Ablehnungen des Browsers werden still ignoriert. */
  static toggleFullscreen(): void {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      } else {
        const p = document.documentElement.requestFullscreen?.();
        if (p) p.catch(() => undefined);
      }
    } catch {
      /* Vollbild nicht verfügbar */
    }
  }
}
