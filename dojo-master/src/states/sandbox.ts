import { CONFIG } from '../config';
import type { Game } from '../core/game';
import { EventSink } from '../core/events';
import { Fighter } from '../fighter/fighter';
import { drawText } from '../render/font';
import { drawFighter, drawShadow } from '../render/fighterRenderer';
import { rgb, type Surface } from '../render/surface';
import type { GameState } from './state';

/** Meilenstein 1: ein steuerbarer Kämpfer auf einer leeren Fläche. */
export class SandboxState implements GameState {
  private readonly events = new EventSink();
  private readonly fighter: Fighter;

  constructor(private readonly game: Game) {
    this.fighter = new Fighter(0, 'weiss', 320, 1, this.events);
  }

  update(): void {
    const f = this.fighter;
    f.update(this.game.input.sample(0));
    f.x = Math.max(CONFIG.arena.minX, Math.min(CONFIG.arena.maxX, f.x));
    f.refreshSkeleton();
    this.events.drain();
  }

  render(s: Surface): void {
    s.clear(rgb('#7ab0e0'));
    s.fillRect(0, 230, 640, 130, rgb('#c8a868'));
    const f = this.fighter;
    drawShadow(s, f.x, f.air);
    drawFighter(s, f.skel, { gi: f.gi, belt: CONFIG.belts[0].color }, f.facing);
    drawText(s, `${f.state} ${f.anim} ${f.animFrame}`, 8, 8, rgb('#ffffff'), { shadow: rgb('#000000') });
  }
}
