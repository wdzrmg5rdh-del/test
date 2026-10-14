import { POSES, type PoseId } from '../data/poses';
import { computeSkeleton, emptySkeleton } from '../fighter/skeleton';
import { drawText } from '../render/font';
import { drawFighter, giLook } from '../render/fighterRenderer';
import { rgb, type Surface } from '../render/surface';
import type { GameState } from './state';

/** Nur für die Entwicklung (Aufruf mit ?posen): zeigt alle Schlüsselposen nebeneinander. */
export class PoseGalleryState implements GameState {
  private readonly ids = Object.keys(POSES) as PoseId[];
  private page = 0;
  constructor(private readonly onKey: () => boolean) {}
  update(): void {
    if (this.onKey()) this.page = (this.page + 1) % Math.ceil(this.ids.length / 24);
  }
  render(s: Surface): void {
    s.clear(rgb('#9ab8c8'));
    const skel = emptySkeleton();
    const ids = this.ids.slice(this.page * 24, this.page * 24 + 24);
    ids.forEach((id, i) => {
      const col = i % 8, row = Math.floor(i / 8);
      const x = 40 + col * 78, y = 110 + row * 118;
      s.fillRect(x - 36, y, 72, 1, rgb('#605040'));
      computeSkeleton(POSES[id], x, y, 1, skel);
      drawFighter(s, skel, giLook((['weiss', 'rot', 'blau'] as const)[row], '#141414'), 1);
      drawText(s, id, x, y + 4, rgb('#000000'), { align: 'center' });
    });
  }
}
