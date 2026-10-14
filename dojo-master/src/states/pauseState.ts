import type { Game } from '../core/game';
import { drawText } from '../render/font';
import { drawMenu, drawPanel, drawTitle, UI } from '../render/menu';
import type { Surface } from '../render/surface';
import { TEXT } from '../texts';
import { ControlsState } from './controlsState';
import { OptionsState } from './optionsState';
import type { GameState } from './state';

/** Pausenmenü über dem angehaltenen Kampf bzw. der Bonusrunde. */
export class PauseState implements GameState {
  private sel = 0;
  private frame = 0;
  private confirmAbort = false;

  constructor(
    private readonly game: Game,
    private readonly under: GameState,
  ) {}

  update(): void {
    this.frame++;
    const m = this.game.input.sampleMenu();
    const n = this.confirmAbort ? 2 : 4;
    if (m.up) {
      this.sel = (this.sel + n - 1) % n;
      this.game.audio.play(['menue']);
    }
    if (m.down) {
      this.sel = (this.sel + 1) % n;
      this.game.audio.play(['menue']);
    }
    if (this.confirmAbort) {
      if (m.back) {
        this.confirmAbort = false;
        this.sel = 3;
      } else if (m.confirm) {
        if (this.sel === 0) this.game.flow.toTitle();
        else {
          this.confirmAbort = false;
          this.sel = 3;
        }
      }
      return;
    }
    if (m.pause || m.back) {
      this.game.flow.resume(this.under);
      return;
    }
    if (m.confirm) {
      this.game.audio.play(['menueBestaetigen']);
      switch (this.sel) {
        case 0:
          this.game.flow.resume(this.under);
          break;
        case 1:
          this.game.setState(new ControlsState(this.game, this));
          break;
        case 2:
          this.game.setState(new OptionsState(this.game, this));
          break;
        case 3:
          this.confirmAbort = true;
          this.sel = 1;
          break;
      }
    }
  }

  render(s: Surface): void {
    this.under.render(s);
    s.ditherRect(0, 0, 640, 360, UI.ink, (this.frame >> 5) & 1);
    drawTitle(s, TEXT.menu.pauseTitle, 100, 3);
    const m = TEXT.menu;
    if (this.confirmAbort) {
      drawPanel(s, 200, 140, 240, 70);
      drawText(s, m.confirmAbort, 320, 152, UI.text, { align: 'center' });
      drawMenu(s, [{ label: m.yes }, { label: m.no }], this.sel, 320, 172, 200, this.frame);
    } else {
      drawPanel(s, 230, 140, 180, 70);
      drawMenu(s, [{ label: m.resume }, { label: m.controls }, { label: m.options }, { label: m.abort }], this.sel, 320, 150, 168, this.frame);
    }
  }
}
