import { drawText, LINE_H, measureText, wrapText } from './font';
import { rgb, type Surface } from './surface';

/** Sprechblase mit Spitze, die auf (tx, ty) zeigt. Die Blase wird in den Bildschirm geschoben. */
export function drawBubble(s: Surface, text: string, tx: number, ty: number, maxChars = 26): void {
  const lines = wrapText(text, maxChars);
  const w = Math.max(...lines.map((l) => measureText(l))) + 10;
  const h = lines.length * LINE_H + 6;
  let x = Math.round(tx - 14);
  x = Math.max(4, Math.min(s.width - w - 4, x));
  const y = Math.round(ty - h - 8);
  const border = rgb('#141018');
  const fill = rgb('#fffbe8');
  s.fillRect(x - 1, y, w + 2, h, border);
  s.fillRect(x, y - 1, w, h + 2, border);
  s.fillRect(x, y, w, h, fill);
  // Spitze
  const bx = Math.max(x + 4, Math.min(x + w - 8, tx));
  for (let i = 0; i < 7; i++) {
    const half = Math.max(0, 3 - Math.floor(i / 2));
    s.fillRect(bx - half - 1, y + h + i, half * 2 + 3, 1, border);
    if (i < 6) s.fillRect(bx - half, y + h - 1 + i, half * 2 + 1, 1, fill);
  }
  lines.forEach((l, i) => drawText(s, l, x + 5, y + 4 + i * LINE_H, rgb('#201820')));
}
