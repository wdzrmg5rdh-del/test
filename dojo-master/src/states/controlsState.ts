import type { Game } from '../core/game';
import { BUTTON_TABLE, DIR_ORDER, MOVE_TABLE } from '../data/controls';
import { BIND_ACTIONS, keyLabel } from '../input/bindings';
import { drawBackground } from '../render/background';
import { drawText } from '../render/font';
import { drawPanel, drawTitle, UI } from '../render/menu';
import type { Surface } from '../render/surface';
import { TEXT } from '../texts';
import type { GameState } from './state';

/** Steuerungsbildschirm mit der vollständigen Zuordnungstabelle. */
export class ControlsState implements GameState {
  private frame = 0;

  constructor(
    private readonly game: Game,
    private readonly back: GameState,
  ) {}

  update(): void {
    this.frame++;
    const m = this.game.input.sampleMenu();
    if ((m.confirm || m.back) && this.frame > 10) {
      this.game.audio.play(['menue']);
      this.game.setState(this.back);
    }
  }

  render(s: Surface): void {
    drawBackground(s, this.frame);
    s.ditherRect(0, 0, 640, 360, UI.ink);
    drawTitle(s, TEXT.controls.title, 8);
    drawPanel(s, 12, 30, 616, 322);
    const c = TEXT.controls;
    drawText(s, c.intro, 320, 38, UI.dim, { align: 'center' });
    const cols = [24, 124, 230, 344, 468];
    const head = [c.colDir, c.colNone, c.colPunch, c.colKick, c.colBlock];
    head.forEach((h, i) => drawText(s, h, cols[i], 52, UI.gold));
    s.fillRect(22, 61, 596, 1, UI.edge);
    DIR_ORDER.forEach(({ dir, symbol }, r) => {
      const y = 66 + r * 12;
      if (r % 2 === 1) s.fillRect(22, y - 2, 596, 11, UI.select);
      drawText(s, `${symbol} ${c.dirs[dir]}`, cols[0], y, UI.text);
      drawText(s, TEXT.moves[MOVE_TABLE[dir]], cols[1], y, UI.text);
      drawText(s, TEXT.moves[BUTTON_TABLE.punch[dir]], cols[2], y, UI.text);
      drawText(s, TEXT.moves[BUTTON_TABLE.kick[dir]], cols[3], y, UI.text);
      drawText(s, TEXT.moves[BUTTON_TABLE.block[dir]], cols[4], y, UI.text);
    });
    let y = 66 + DIR_ORDER.length * 12 + 6;
    s.fillRect(22, y - 3, 596, 1, UI.edge);
    for (const p of [0, 1] as const) {
      const kb = this.game.settings.keys[p];
      const line = BIND_ACTIONS.map((a) => `${TEXT.options.actions[a]} ${kb[a].map(keyLabel).join('/')}`).join('  ');
      drawText(s, p === 0 ? c.p1 : c.p2, 24, y, UI.gold);
      drawText(s, line, 92, y, UI.text);
      y += 12;
    }
    drawText(s, c.gamepad, 24, y, UI.text);
    y += 14;
    drawText(s, c.abwehrHinweis, 24, y, UI.accent);
    y += 12;
    drawText(s, c.bonus, 24, y, UI.accent);
    y += 12;
    drawText(s, TEXT.menu.hintFullscreen, 24, y, UI.dim);
    drawText(s, TEXT.menu.back + ': ESC / ENTER', 616, 340, UI.text, { align: 'right' });
  }
}
