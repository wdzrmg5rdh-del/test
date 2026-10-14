import { CONFIG } from '../config';
import { EventSink } from '../core/events';
import type { Game } from '../core/game';
import { Fighter } from '../fighter/fighter';
import { drawBackground } from '../render/background';
import { drawFighter, drawShadow, giLook } from '../render/fighterRenderer';
import { drawText } from '../render/font';
import { drawMenu, drawPanel, UI } from '../render/menu';
import type { Surface } from '../render/surface';
import { TEXT } from '../texts';
import { ControlsState } from './controlsState';
import { HighscoreState } from './highscoreState';
import { OptionsState } from './optionsState';
import type { GameState } from './state';

/** Titelbildschirm mit Moduswahl, Optionen, Steuerung und Bestenliste. */
export class TitleState implements GameState {
  private sel = 0;
  private frame = 0;
  private readonly fighters: Fighter[];

  constructor(private readonly game: Game) {
    const ev = new EventSink();
    this.fighters = (['weiss', 'rot', 'blau'] as const).map(
      (gi, i) => new Fighter(i, gi, CONFIG.arena.startX[i], CONFIG.arena.startFacing[i], ev),
    );
    this.fighters[1].facing = 1;
  }

  private items(): string[] {
    const m = TEXT.menu;
    return [m.onePlayer, m.twoPlayers, m.options, m.controls, m.highscores];
  }

  update(): void {
    this.frame++;
    // Kleine Vorführung: Verbeugung, Kampfstellung, Siegerpose im Wechsel
    const cycle = this.frame % 600;
    this.fighters.forEach((f, i) => {
      if (cycle === 1 + i * 20) f.ceremony('bow');
      if (cycle === 160 + i * 20) f.reset(f.x, f.facing);
      if (cycle === 420 + i * 30) f.ceremony(i === 1 ? 'victory' : 'ready');
      f.update(null);
    });
    const m = this.game.input.sampleMenu();
    const n = this.items().length;
    if (m.up) {
      this.sel = (this.sel + n - 1) % n;
      this.game.audio.play(['menue']);
    }
    if (m.down) {
      this.sel = (this.sel + 1) % n;
      this.game.audio.play(['menue']);
    }
    if (m.confirm) {
      this.game.audio.play(['menueBestaetigen']);
      switch (this.sel) {
        case 0:
          this.game.flow.newGame(1);
          break;
        case 1:
          this.game.flow.newGame(2);
          break;
        case 2:
          this.game.setState(new OptionsState(this.game, this));
          break;
        case 3:
          this.game.setState(new ControlsState(this.game, this));
          break;
        case 4:
          this.game.setState(new HighscoreState(this.game, this));
          break;
      }
    }
  }

  render(s: Surface): void {
    drawBackground(s, this.frame);
    for (const f of this.fighters) drawShadow(s, f.x, f.air);
    for (const f of this.fighters) drawFighter(s, f.skel, giLook(f.gi, CONFIG.belts[0].color), f.facing);
    const bob = Math.round(Math.sin(this.frame * 0.04) * 2);
    drawText(s, TEXT.gameName, 320, 28 + bob, UI.gold, { align: 'center', scale: 5, shadow: UI.ink });
    drawText(s, TEXT.subtitle, 320, 72, UI.text, { align: 'center', scale: 2, shadow: UI.ink });
    drawPanel(s, 220, 98, 200, 80);
    drawMenu(
      s,
      this.items().map((label) => ({ label })),
      this.sel,
      320,
    108,
      188,
      this.frame,
    );
    drawText(s, `${TEXT.hud.highscore} ${this.game.highscores[0]?.name ?? ''} ${String(this.game.highscore()).padStart(6, '0')}`, 320, 186, UI.text, {
      align: 'center',
      shadow: UI.ink,
    });
    drawText(s, TEXT.menu.hintNavigate, 320, 338, UI.text, { align: 'center', shadow: UI.ink });
    drawText(s, TEXT.menu.hintFullscreen, 320, 349, UI.dim, { align: 'center', shadow: UI.ink });
    if (!this.game.audio.ready) drawText(s, TEXT.audioHint, 320, 200, UI.accent, { align: 'center', shadow: UI.ink });
  }
}
