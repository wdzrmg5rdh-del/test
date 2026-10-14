import { CONFIG } from '../config';
import { rgb, type Surface } from './surface';

/** Vorläufiger Hintergrund (wird in Meilenstein 6 ersetzt). */
export function drawBackground(s: Surface, _frame: number): void {
  s.clear(rgb('#7ab0e0'));
  s.fillRect(0, 230, 640, 130, rgb('#c8a868'));
  s.fillRect(0, CONFIG.arena.groundY + 4, 640, 1, rgb('#a88848'));
}
