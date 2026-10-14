import { drawText, measureText } from './font';
import { rgb, type Surface } from './surface';

export const UI = {
  ink: rgb('#141018'),
  panel: rgb('#2a2430'),
  edge: rgb('#5a5060'),
  text: rgb('#f4ecd8'),
  dim: rgb('#a098a8'),
  gold: rgb('#f8c838'),
  accent: rgb('#80e0ff'),
  red: rgb('#ff6050'),
  select: rgb('#4a3a58'),
};

export function drawPanel(s: Surface, x: number, y: number, w: number, h: number): void {
  s.fillRect(x - 2, y - 2, w + 4, h + 4, UI.ink);
  s.fillRect(x, y, w, h, UI.panel);
  s.strokeRect(x + 2, y + 2, w - 4, h - 4, UI.edge);
}

/** Großer Titel mit Schatten. */
export function drawTitle(s: Surface, text: string, y: number, scale = 2): void {
  drawText(s, text, 320, y, UI.gold, { align: 'center', scale, shadow: UI.ink });
}

export interface MenuItem {
  label: string;
  value?: string;
  disabled?: boolean;
}

/** Senkrechte Menüliste; bei Werten steht die Beschriftung links, der Wert rechts. */
export function drawMenu(s: Surface, items: MenuItem[], sel: number, cx: number, y: number, width: number, frame: number): void {
  items.forEach((it, i) => {
    const iy = y + i * 14;
    const selected = i === sel;
    if (selected) s.fillRect(cx - width / 2, iy - 3, width, 13, UI.select);
    const c = it.disabled ? UI.dim : selected ? UI.gold : UI.text;
    if (it.value !== undefined) {
      drawText(s, it.label, cx - width / 2 + 10, iy, c);
      drawText(s, it.value, cx + width / 2 - 10, iy, selected ? UI.accent : UI.text, { align: 'right' });
    } else {
      drawText(s, it.label, cx, iy, c, { align: 'center' });
    }
    if (selected && (frame >> 4) % 2 === 0) {
      const w = it.value !== undefined ? width - 8 : measureText(it.label) + 16;
      drawText(s, '>', cx - w / 2 - 4, iy, UI.gold);
    }
  });
}
