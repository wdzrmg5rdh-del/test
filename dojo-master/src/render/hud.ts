import { CONFIG } from '../config';
import type { GiColor } from '../fighter/fighter';
import { TEXT } from '../texts';
import { drawText, measureText } from './font';
import { GI_COLORS } from './fighterRenderer';
import { rgb, shade, type Surface } from './surface';

export interface HudFighter {
  gi: GiColor;
  label: string;
  /** Rundenpunkte in halben Punkten. */
  roundPoints: number;
  human: boolean;
  score: number;
  beltIndex: number;
}

export interface HudData {
  fighters: HudFighter[];
  seconds: number;
  highscore: number;
  round: number;
}

const INK = rgb('#141018');
const PANEL = rgb('#2a2430');
const PANEL_EDGE = rgb('#5a5060');
const TEXT_C = rgb('#f4ecd8');
const GOLD = rgb('#f8c838');
const GOLD_DARK = rgb('#a07010');

/** Punktsymbol: leer, halb oder voll gefüllter Kreis. */
export function drawPointSymbol(s: Surface, cx: number, cy: number, halves: number): void {
  const r = 4.5;
  s.fillCircle(cx, cy, r + 1, INK);
  s.fillCircle(cx, cy, r, rgb('#4a4250'));
  if (halves >= 2) {
    s.fillCircle(cx, cy, r, GOLD);
    s.pset(cx - 2, cy - 2, rgb('#fff0a0'));
  } else if (halves === 1) {
    // linke Hälfte gefüllt
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x < cx; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) s.pset(x, y, GOLD);
      }
    }
    s.fillRect(Math.floor(cx), Math.round(cy - r), 1, Math.round(2 * r), GOLD_DARK);
  }
}

export function drawBeltIcon(s: Surface, x: number, y: number, beltIndex: number): void {
  const c = rgb(CONFIG.belts[beltIndex].color);
  s.fillRect(x - 1, y - 1, 26, 7, INK);
  s.fillRect(x, y, 24, 5, c);
  s.fillRect(x + 10, y - 1, 5, 7, shade(c, 0.7));
  s.fillRect(x + 10, y + 5, 2, 4, c);
  s.fillRect(x + 13, y + 5, 2, 3, c);
}

export function drawHud(s: Surface, d: HudData): void {
  const winSlots = CONFIG.rules.winPoints;
  d.fighters.forEach((f, i) => {
    const x0 = 4 + i * 212;
    const y0 = 3;
    const w = 208, h = 36;
    s.fillRect(x0, y0, w, h, INK);
    s.fillRect(x0 + 1, y0 + 1, w - 2, h - 2, PANEL_EDGE);
    s.fillRect(x0 + 2, y0 + 2, w - 4, h - 4, PANEL);
    const gc = GI_COLORS[f.gi];
    s.fillRect(x0 + 5, y0 + 5, 9, 9, INK);
    s.fillRect(x0 + 6, y0 + 6, 7, 7, rgb(gc.main));
    drawText(s, f.label, x0 + 18, y0 + 6, TEXT_C);
    for (let p = 0; p < winSlots; p++) {
      const halves = Math.max(0, Math.min(2, f.roundPoints - p * 2));
      drawPointSymbol(s, x0 + 11 + p * 12, y0 + 25, halves);
    }
    if (f.human) {
      drawText(s, String(f.score).padStart(6, '0'), x0 + w - 6, y0 + 6, GOLD, { align: 'right' });
      const beltName = TEXT.belts[CONFIG.belts[f.beltIndex].id];
      const bw = measureText(beltName);
      drawText(s, beltName, x0 + w - 6, y0 + 22, TEXT_C, { align: 'right' });
      drawBeltIcon(s, x0 + w - 12 - bw - 26, y0 + 23, f.beltIndex);
    } else {
      drawText(s, TEXT.hud.cpu, x0 + w - 6, y0 + 6, rgb('#a098a8'), { align: 'right' });
    }
  });

  // Rundenzeit
  const t = String(Math.max(0, d.seconds)).padStart(2, '0');
  const tx = 320;
  s.fillRect(tx - 22, 42, 44, 26, INK);
  s.fillRect(tx - 21, 43, 42, 24, PANEL);
  drawText(s, t, tx, 47, d.seconds <= 5 ? rgb('#ff6050') : TEXT_C, { scale: 2, align: 'center' });
  drawText(s, `${TEXT.hud.highscore} ${String(d.highscore).padStart(6, '0')}`, tx - 30, 50, TEXT_C, {
    align: 'right',
    shadow: INK,
  });
  drawText(s, `${TEXT.hud.round} ${d.round}`, tx + 30, 50, TEXT_C, { shadow: INK });
}
