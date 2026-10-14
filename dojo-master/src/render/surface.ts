/**
 * Software-Framebuffer in der logischen Auflösung.
 *
 * Alle Grafik wird pixelgenau in diesen Puffer gezeichnet (ohne Kantenglättung)
 * und anschließend als Ganzes ganzzahlig skaliert auf den Bildschirm gebracht.
 * Farben sind als 32-Bit-Werte im Format 0xAABBGGRR (Little Endian) gespeichert.
 */

const colorCache = new Map<string, number>();

/** Wandelt '#rrggbb' in einen gepackten Pixelwert um. */
export function rgb(hex: string): number {
  let c = colorCache.get(hex);
  if (c !== undefined) return c;
  const v = parseInt(hex.slice(1), 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  c = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  colorCache.set(hex, c);
  return c;
}

export function packRgb(r: number, g: number, b: number): number {
  return ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}

/** Mischt zwei gepackte Farben (t = 0 → a, t = 1 → b). */
export function mix(a: number, b: number, t: number): number {
  const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255;
  const br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
  return packRgb(
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t),
  );
}

/** Dunkelt bzw. hellt eine Farbe um den Faktor f auf. */
export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.round((c & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round(((c >> 16) & 255) * f));
  return packRgb(r, g, b);
}

export class Surface {
  readonly width: number;
  readonly height: number;
  readonly bytes: Uint8ClampedArray<ArrayBuffer>;
  readonly data: Uint32Array;
  /** Optionaler Clip-Bereich in Y (für Spiegelungen u. Ä.). */
  clipTop = 0;
  clipBottom: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bytes = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
    this.data = new Uint32Array(this.bytes.buffer);
    this.clipBottom = height;
  }

  clear(c: number): void {
    this.data.fill(c);
  }

  copyFrom(src: Surface): void {
    this.data.set(src.data);
  }

  pset(x: number, y: number, c: number): void {
    x |= 0;
    y |= 0;
    if (x < 0 || y < this.clipTop || x >= this.width || y >= this.clipBottom) return;
    this.data[y * this.width + x] = c;
  }

  pget(x: number, y: number): number {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  fillRect(x: number, y: number, w: number, h: number, c: number): void {
    let x0 = Math.round(x), y0 = Math.round(y);
    let x1 = x0 + Math.round(w), y1 = y0 + Math.round(h);
    if (x0 < 0) x0 = 0;
    if (y0 < this.clipTop) y0 = this.clipTop;
    if (x1 > this.width) x1 = this.width;
    if (y1 > this.clipBottom) y1 = this.clipBottom;
    if (x1 <= x0 || y1 <= y0) return;
    for (let yy = y0; yy < y1; yy++) {
      const row = yy * this.width;
      this.data.fill(c, row + x0, row + x1);
    }
  }

  /** Rahmen mit 1 Pixel Stärke. */
  strokeRect(x: number, y: number, w: number, h: number, c: number): void {
    this.fillRect(x, y, w, 1, c);
    this.fillRect(x, y + h - 1, w, 1, c);
    this.fillRect(x, y, 1, h, c);
    this.fillRect(x + w - 1, y, 1, h, c);
  }

  /** Schachbrett-Dithering über einen Bereich (für Abdunklungen im Retro-Stil). */
  ditherRect(x: number, y: number, w: number, h: number, c: number, phase = 0): void {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x + w)), y1 = Math.min(this.height, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      const row = yy * this.width;
      for (let xx = x0 + ((yy + phase) & 1); xx < x1; xx += 2) this.data[row + xx] = c;
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.pset(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  fillCircle(cx: number, cy: number, r: number, c: number): void {
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      if (y < this.clipTop || y >= this.clipBottom) continue;
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) this.pset(x, y, c);
      }
    }
  }

  /** Gefüllte Ellipse. */
  fillEllipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        if (dx * dx + dy * dy <= 1) this.pset(x, y, c);
      }
    }
  }

  /** Strecke mit runden Enden und Radius r („Kapsel“), Grundform aller Gliedmaßen. */
  capsule(x1: number, y1: number, x2: number, y2: number, r: number, c: number): void {
    const minX = Math.floor(Math.min(x1, x2) - r), maxX = Math.ceil(Math.max(x1, x2) + r);
    const minY = Math.floor(Math.min(y1, y2) - r), maxY = Math.ceil(Math.max(y1, y2) + r);
    const vx = x2 - x1, vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1e-6;
    const r2 = r * r;
    for (let y = minY; y <= maxY; y++) {
      if (y < this.clipTop || y >= this.clipBottom) continue;
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        let t = ((px - x1) * vx + (py - y1) * vy) / len2;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const dx = px - (x1 + vx * t), dy = py - (y1 + vy * t);
        if (dx * dx + dy * dy <= r2) this.pset(x, y, c);
      }
    }
  }

  /** Gefülltes Polygon (Even-Odd-Regel, Abtastung in Pixelmitte). */
  fillPoly(pts: ReadonlyArray<readonly [number, number]>, c: number): void {
    if (pts.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    const xs: number[] = [];
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi > sy) !== (yj > sy)) xs.push(xi + ((sy - yi) * (xj - xi)) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
        if (xb > xa) this.fillRect(xa, y, xb - xa, 1, c);
      }
    }
  }

  /** Kopiert einen anderen Puffer mit Transparenz (Alpha 0 wird übersprungen). */
  blit(src: Surface, dx: number, dy: number): void {
    dx = Math.round(dx);
    dy = Math.round(dy);
    for (let y = 0; y < src.height; y++) {
      const ty = y + dy;
      if (ty < 0 || ty >= this.height) continue;
      for (let x = 0; x < src.width; x++) {
        const tx = x + dx;
        if (tx < 0 || tx >= this.width) continue;
        const c = src.data[y * src.width + x];
        if (c >>> 24) this.data[ty * this.width + tx] = c;
      }
    }
  }
}
