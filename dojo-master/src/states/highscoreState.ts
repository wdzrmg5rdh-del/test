import { CONFIG } from '../config';
import type { Game } from '../core/game';
import { drawBackground } from '../render/background';
import { drawText } from '../render/font';
import { drawBeltIcon } from '../render/hud';
import { drawPanel, drawTitle, UI } from '../render/menu';
import type { Surface } from '../render/surface';
import { TEXT } from '../texts';
import type { GameState } from './state';

/** Bestenliste mit zehn Einträgen. */
export class HighscoreState implements GameState {
  private frame = 0;

  constructor(
    private readonly game: Game,
    private readonly back: GameState,
    /** Hervorzuhebende Einträge (Index in der Liste), z. B. nach der Namenseingabe. */
    private readonly highlight: number[] = [],
  ) {}

  update(): void {
    this.frame++;
    const m = this.game.input.sampleMenu();
    if ((m.confirm || m.back) && this.frame > 20) {
      this.game.audio.play(['menue']);
      this.game.setState(this.back);
    }
  }

  render(s: Surface): void {
    drawBackground(s, this.frame);
    s.ditherRect(0, 0, 640, 360, UI.ink);
    drawTitle(s, TEXT.highscores.title, 20);
    drawPanel(s, 130, 52, 380, 210);
    const h = TEXT.highscores;
    drawText(s, h.rank, 150, 64, UI.gold);
    drawText(s, h.name, 190, 64, UI.gold);
    drawText(s, h.score, 380, 64, UI.gold, { align: 'right' });
    drawText(s, h.belt, 410, 64, UI.gold);
    for (let i = 0; i < CONFIG.highscore.entries; i++) {
      const e = this.game.highscores[i];
      const y = 82 + i * 17;
      const hl = this.highlight.includes(i);
      if (hl && (this.frame >> 3) % 2 === 0) s.fillRect(140, y - 4, 360, 15, UI.select);
      const c = hl ? UI.gold : UI.text;
      drawText(s, `${i + 1}.`, 150, y, c);
      if (!e) {
        drawText(s, h.empty, 190, y, UI.dim);
        continue;
      }
      drawText(s, e.name, 190, y, c);
      drawText(s, String(e.score).padStart(6, '0'), 380, y, c, { align: 'right' });
      drawBeltIcon(s, 410, y + 1, e.belt);
      drawText(s, TEXT.belts[CONFIG.belts[e.belt].id], 442, y, c);
    }
    drawText(s, TEXT.menu.back + ': ESC / ENTER', 320, 340, UI.text, { align: 'center', shadow: UI.ink });
  }
}
