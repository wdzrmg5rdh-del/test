import { CONFIG } from '../config';
import { mix, rgb, Surface } from './surface';

/**
 * Hintergrund: ruhige Abendszene am See mit Bergen, Insel mit Pagode und einer
 * sandigen Kampffläche. Der statische Teil wird einmal vorberechnet, darüber
 * laufen kleine Animationen (Wolken, Vögel, Glitzern auf dem Wasser,
 * Segelboot, springender Fisch, Laternenflackern). Alle Animationen liegen
 * hinter den Kämpfern und verdecken das Kampfgeschehen nie.
 */

const W = CONFIG.screen.width;
const H = CONFIG.screen.height;
const HORIZON = 196;
const SHORE = 238;

let staticLayer: Surface | null = null;

function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function ridge(x: number, seed: number, amp: number, base: number): number {
  return (
    base -
    amp *
      (0.5 * Math.sin(x * 0.011 + seed) +
        0.3 * Math.sin(x * 0.027 + seed * 2.1) +
        0.2 * Math.sin(x * 0.061 + seed * 3.7) +
        0.5)
  );
}

function buildStatic(): Surface {
  const s = new Surface(W, H);
  // Himmel: Farbbänder mit Dithering an den Übergängen
  const skyTop = rgb('#1c2a5c');
  const skyMid = rgb('#4a5a9a');
  const skyLow = rgb('#d88a6a');
  const skyHorizon = rgb('#f4c890');
  const bands = 14;
  for (let y = 0; y < HORIZON; y++) {
    const t = y / HORIZON;
    const q = Math.floor(t * bands) / bands;
    const frac = t * bands - Math.floor(t * bands);
    const col = (tt: number) =>
      tt < 0.5 ? mix(skyTop, skyMid, tt / 0.5) : tt < 0.85 ? mix(skyMid, skyLow, (tt - 0.5) / 0.35) : mix(skyLow, skyHorizon, (tt - 0.85) / 0.15);
    const c1 = col(q);
    const c2 = col(Math.min(1, q + 1 / bands));
    for (let x = 0; x < W; x++) {
      const dither = frac > 0.75 && (x + y) % 2 === 0;
      s.pset(x, y, dither ? c2 : c1);
    }
  }
  // Sterne im oberen Himmel
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i * 7 + 1) * W);
    const y = Math.floor(hash(i * 7 + 2) * 70);
    s.pset(x, y, rgb(hash(i) > 0.5 ? '#c8d0f0' : '#8090c8'));
  }
  // Sonne knapp über dem Horizont
  s.fillCircle(470, 172, 26, rgb('#f8d8a0'));
  s.fillCircle(470, 172, 22, rgb('#fce8b8'));
  // Ferne Berge
  const far = rgb('#6a6a9c');
  const near = rgb('#4a4a7a');
  for (let x = 0; x < W; x++) {
    const y1 = Math.round(ridge(x, 1.3, 46, 192));
    for (let y = y1; y < HORIZON; y++) s.pset(x, y, far);
    const y2 = Math.round(ridge(x, 4.1, 30, 199));
    for (let y = y2; y < HORIZON; y++) s.pset(x, y, near);
  }
  // Schneekappen
  for (let x = 0; x < W; x++) {
    const y1 = Math.round(ridge(x, 1.3, 46, 192));
    if (y1 < 158) for (let y = y1; y < y1 + 3; y++) if ((x + y) % 3 !== 0) s.pset(x, y, rgb('#c8c8e8'));
  }
  // See
  const water = rgb('#2c4a7c');
  const waterLight = rgb('#3c6094');
  for (let y = HORIZON; y < SHORE; y++) {
    const t = (y - HORIZON) / (SHORE - HORIZON);
    s.fillRect(0, y, W, 1, mix(waterLight, water, t));
  }
  // Spiegelung der Sonne
  for (let y = HORIZON + 1; y < SHORE - 4; y += 2) {
    const w = 18 - (y - HORIZON) * 0.25;
    s.fillRect(470 - w, y, w * 2, 1, rgb('#d8a878'));
  }
  // Insel mit Kiefer und Pagode
  const isl = rgb('#2a3048');
  s.fillEllipse(150, HORIZON + 7, 56, 7, isl);
  pagoda(s, 150, HORIZON + 2);
  pine(s, 196, HORIZON + 4, 0.6, isl);
  // Uferlinie
  for (let x = 0; x < W; x++) {
    const y = SHORE + Math.round(Math.sin(x * 0.05) * 1.2);
    s.fillRect(x, y - 1, 1, 2, rgb('#e8d8a8'));
  }
  // Kampffläche (Sand) mit leichter Struktur
  const sandFar = rgb('#c8a46a');
  const sandNear = rgb('#d8b47a');
  for (let y = SHORE + 1; y < H; y++) {
    const t = (y - SHORE) / (H - SHORE);
    s.fillRect(0, y, W, 1, mix(sandFar, sandNear, t));
  }
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(hash(i * 3 + 11) * W);
    const y = SHORE + 2 + Math.floor(hash(i * 3 + 12) * (H - SHORE - 2));
    s.pset(x, y, hash(i * 3 + 13) > 0.5 ? rgb('#b8945a') : rgb('#e8c88a'));
  }
  // Geharkte Linien im Sand (Zen-Garten) vor und hinter der Kampflinie
  for (const [y0, y1] of [
    [250, 262],
    [334, 352],
  ]) {
    for (let y = y0; y <= y1; y += 4) {
      for (let x = 0; x < W; x++) if (Math.floor(x / 3) % 3 !== 0) s.pset(x, y + Math.round(Math.sin(x * 0.04) * 1), rgb('#bc9a60'));
    }
  }
  // Steinplatten der Kampffläche
  for (let x = 30; x < W - 20; x += 46) {
    s.fillRect(x, CONFIG.arena.groundY + 3, 40, 2, rgb('#a88a58'));
  }
  // Steinlaterne rechts hinten und Kiefer links hinten
  lantern(s, 612, SHORE + 22);
  pine(s, 70, SHORE + 18, 1, rgb('#22402a'));
  rock(s, 560, SHORE + 12, 14, 7);
  rock(s, 588, SHORE + 15, 8, 4);
  return s;
}

function pagoda(s: Surface, x: number, base: number): void {
  const c = rgb('#20243a');
  const roof = rgb('#1a1c2e');
  for (let i = 0; i < 3; i++) {
    const y = base - i * 9;
    const w = 12 - i * 3;
    s.fillRect(x - w + 3, y - 6, (w - 3) * 2, 6, c);
    s.fillPoly(
      [
        [x - w - 3, y - 6],
        [x + w + 3, y - 6],
        [x + w - 1, y - 9],
        [x - w + 1, y - 9],
      ],
      roof,
    );
  }
  s.fillRect(x, base - 33, 1, 6, roof);
}

function pine(s: Surface, x: number, base: number, scale: number, color: number): void {
  const trunk = rgb('#3a2a1c');
  s.fillRect(x - 1, base - 30 * scale, Math.max(2, 3 * scale), 30 * scale, trunk);
  const layers = [
    [-30, 26],
    [-42, 22],
    [-52, 16],
    [-60, 9],
  ];
  for (const [dy, w] of layers) {
    const y = base + dy * scale;
    s.fillEllipse(x + 4 * scale, y, w * scale, 6 * scale, color);
    s.fillEllipse(x + 2 * scale, y - 2 * scale, w * 0.7 * scale, 3 * scale, mix(color, rgb('#4a7050'), 0.4));
  }
}

function lantern(s: Surface, x: number, base: number): void {
  const st = rgb('#8a8a90');
  const dark = rgb('#5a5a64');
  s.fillRect(x - 7, base - 4, 14, 4, dark);
  s.fillRect(x - 3, base - 20, 6, 16, st);
  s.fillRect(x - 8, base - 22, 16, 3, dark);
  s.fillRect(x - 6, base - 32, 12, 10, st);
  s.fillRect(x - 3, base - 29, 6, 5, rgb('#302a20'));
  s.fillPoly(
    [
      [x - 11, base - 32],
      [x + 11, base - 32],
      [x + 4, base - 39],
      [x - 4, base - 39],
    ],
    dark,
  );
  s.fillRect(x - 1, base - 42, 3, 3, dark);
}

function rock(s: Surface, x: number, y: number, rx: number, ry: number): void {
  s.fillEllipse(x, y, rx, ry, rgb('#6a6458'));
  s.fillEllipse(x - rx * 0.25, y - ry * 0.35, rx * 0.6, ry * 0.45, rgb('#8a8474'));
}

// ---------------------------------------------------------------
// Animierte Elemente (nur abhängig vom Bildzähler, nicht von der Spiellogik)

function clouds(s: Surface, f: number): void {
  const defs = [
    { y: 40, speed: 0.05, w: 46, off: 0 },
    { y: 78, speed: 0.08, w: 34, off: 260 },
    { y: 112, speed: 0.11, w: 28, off: 470 },
  ];
  for (const d of defs) {
    const span = W + 140;
    const x = ((d.off + f * d.speed) % span) - 70;
    const c = rgb('#e8b8a8');
    const sh = rgb('#b88a90');
    s.fillEllipse(x, d.y + 2, d.w, 5, sh);
    s.fillEllipse(x - d.w * 0.3, d.y - 1, d.w * 0.45, 5, c);
    s.fillEllipse(x + d.w * 0.2, d.y - 3, d.w * 0.5, 6, c);
    s.fillEllipse(x, d.y, d.w * 0.9, 4, c);
  }
}

function birds(s: Surface, f: number): void {
  const period = 1500;
  const t = f % period;
  if (t > 900) return;
  const flock = Math.floor(f / period);
  const baseY = 70 + (flock % 3) * 22;
  const dir = flock % 2 === 0 ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    const x = dir === 1 ? -20 + t * 0.8 - i * 14 : W + 20 - t * 0.8 + i * 14;
    const y = baseY + i * 5 + Math.sin((f + i * 20) * 0.05) * 2;
    const up = ((f >> 3) + i) % 2 === 0;
    const c = rgb('#202238');
    s.pset(x, y, c);
    s.pset(x - 1, y + (up ? -1 : 1), c);
    s.pset(x + 1, y + (up ? -1 : 1), c);
    s.pset(x - 2, y + (up ? -2 : 1), c);
    s.pset(x + 2, y + (up ? -2 : 1), c);
  }
}

function waterSparkle(s: Surface, f: number): void {
  for (let i = 0; i < 26; i++) {
    const phase = Math.floor((f + i * 37) / 24);
    const x = Math.floor(hash(i * 13 + phase * 101) * W);
    const y = HORIZON + 3 + Math.floor(hash(i * 17 + phase * 59) * (SHORE - HORIZON - 8));
    const near = Math.abs(x - 470) < 30;
    s.fillRect(x, y, near ? 3 : 2, 1, near ? rgb('#fff0c0') : rgb('#7aa0d0'));
  }
  // Wellenlinien, die langsam wandern
  for (let k = 0; k < 4; k++) {
    const y = HORIZON + 8 + k * 9;
    const shift = (f * (0.2 + k * 0.1) + k * 50) % 40;
    for (let x = -40 + shift; x < W; x += 40) s.fillRect(x, y, 12, 1, rgb('#4a70a8'));
  }
}

function sailboat(s: Surface, f: number): void {
  const period = 3600;
  const t = f % period;
  if (t > 2400) return;
  const x = W + 30 - t * 0.29;
  const y = HORIZON + 6;
  const hull = rgb('#3a2a20');
  const sail = rgb('#f0e0c8');
  s.fillPoly(
    [
      [x - 9, y],
      [x + 9, y],
      [x + 6, y + 3],
      [x - 6, y + 3],
    ],
    hull,
  );
  s.fillRect(x, y - 16, 1, 16, hull);
  s.fillPoly(
    [
      [x + 1, y - 15],
      [x + 1, y - 1],
      [x + 9, y - 2],
    ],
    sail,
  );
  s.fillPoly(
    [
      [x - 1, y - 12],
      [x - 1, y - 1],
      [x - 7, y - 2],
    ],
    rgb('#d8c8b0'),
  );
}

function fish(s: Surface, f: number): void {
  const period = 780;
  const t = f % period;
  if (t > 50) return;
  const n = Math.floor(f / period);
  const x0 = 260 + Math.floor(hash(n * 31 + 5) * 300);
  const p = t / 50;
  const x = x0 + p * 26;
  const y = SHORE - 14 - Math.sin(p * Math.PI) * 18;
  const c = rgb('#c8d0e0');
  s.fillEllipse(x, y, 3.5, 1.6, c);
  s.pset(x - 4, y - 1, c);
  s.pset(x - 4, y + 1, c);
  if (t < 6 || t > 44) {
    const sx = t < 6 ? x0 : x0 + 26;
    s.fillRect(sx - 3, SHORE - 13, 7, 1, rgb('#e0f0ff'));
  }
}

function lanternGlow(s: Surface, f: number): void {
  const flick = hash(Math.floor(f / 5)) > 0.3;
  s.fillRect(609, SHORE - 6, 6, 4, flick ? rgb('#f8c050') : rgb('#d89030'));
}

export function drawBackground(s: Surface, frame: number): void {
  if (!staticLayer) staticLayer = buildStatic();
  s.copyFrom(staticLayer);
  clouds(s, frame);
  birds(s, frame);
  waterSparkle(s, frame);
  sailboat(s, frame);
  fish(s, frame);
  lanternGlow(s, frame);
}
