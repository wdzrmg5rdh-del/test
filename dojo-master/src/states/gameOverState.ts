import { CONFIG } from '../config';
import type { Game } from '../core/game';
import { drawText } from '../render/font';
import { drawBackground } from '../render/background';
import { drawBeltIcon } from '../render/hud';
import { drawPanel, drawTitle, UI } from '../render/menu';
import type { Surface } from '../render/surface';
import type { PlayerProfile, Session } from '../rules/session';
import { highscoreRank, insertHighscore } from '../storage/storage';
import { TEXT } from '../texts';
import { HighscoreState } from './highscoreState';
import type { GameState } from './state';

const CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789-.!';

/** Spielende: Punktzahl, Gürtel und Namenseingabe für die Bestenliste. */
export class GameOverState implements GameState {
  private frame = 0;
  private queue: PlayerProfile[];
  private entering: PlayerProfile | null = null;
  private name: string[] = [];
  private cursor = 0;
  private readonly inserted: number[] = [];

  constructor(
    private readonly game: Game,
    private readonly session: Session,
  ) {
    this.queue = [...session.players].sort((a, b) => b.score - a.score);
  }

  private startNext(): void {
    while (this.queue.length > 0) {
      const p = this.queue.shift()!;
      if (highscoreRank(this.game.highscores, p.score) >= 0) {
        this.entering = p;
        this.name = Array(CONFIG.highscore.nameLength).fill(' ');
        this.name[0] = 'A';
        this.cursor = 0;
        return;
      }
    }
    this.entering = null;
    this.game.setState(new HighscoreState(this.game, this.titleState(), this.inserted));
  }

  private titleState(): GameState {
    return this.game.flow.titleState();
  }

  update(): void {
    this.frame++;
    const inp = this.game.input;
    if (!this.entering) {
      const m = inp.sampleMenu();
      if (this.frame > 90 && (m.confirm || this.frame > 60 * 8)) this.startNext();
      return;
    }
    // Namenseingabe: Tippen auf der Tastatur oder Buchstabenwahl mit Pfeiltasten/Gamepad
    const m = inp.sampleMenu(false);
    for (const ch of inp.typed) {
      if (ch === '\b') {
        this.cursor = Math.max(0, this.cursor - (this.name[this.cursor] === ' ' ? 1 : 0));
        this.name[this.cursor] = ' ';
        continue;
      }
      const up = ch.toUpperCase();
      if (up.length === 1 && CHARSET.includes(up) && this.cursor < this.name.length) {
        this.name[this.cursor] = up;
        this.cursor = Math.min(this.name.length - 1, this.cursor + 1);
        this.game.audio.play(['menue']);
      }
    }
    const cycle = (d: number) => {
      const i = CHARSET.indexOf(this.name[this.cursor]);
      this.name[this.cursor] = CHARSET[(i + d + CHARSET.length) % CHARSET.length];
      this.game.audio.play(['menue']);
    };
    if (m.up) cycle(1);
    if (m.down) cycle(-1);
    if (m.right) {
      this.cursor = Math.min(this.name.length - 1, this.cursor + 1);
      if (this.name[this.cursor] === ' ' && this.cursor > 0) this.name[this.cursor] = this.name[this.cursor - 1] === ' ' ? ' ' : 'A';
    }
    if (m.left) this.cursor = Math.max(0, this.cursor - 1);
    const done = inp.wasTapped('Enter') || inp.wasTapped('NumpadEnter') || (m.confirm && !inp.wasTapped('Space'));
    if (done) {
      const name = this.name.join('').trim() || '???';
      const p = this.entering;
      this.game.highscores = insertHighscore(this.game.highscores, { name, score: p.score, belt: p.beltIndex });
      const idx = this.game.highscores.findIndex((e) => e.name === name && e.score === p.score);
      if (idx >= 0) this.inserted.push(idx);
      this.game.audio.play(['guertel']);
      this.startNext();
    }
  }

  render(s: Surface): void {
    drawBackground(s, this.frame);
    s.ditherRect(0, 0, 640, 360, UI.ink);
    drawTitle(s, TEXT.gameOver.title, 30, 4);
    const g = TEXT.gameOver;
    const players = this.session.players;
    drawPanel(s, 140, 80, 360, 40 + players.length * 26);
    players.forEach((p, i) => {
      const y = 92 + i * 26;
      drawText(s, p.player === 0 ? TEXT.players.p1 : TEXT.players.p2, 156, y, UI.gold);
      drawText(s, `${g.score} ${String(p.score).padStart(6, '0')}`, 264, y, UI.text);
      drawText(s, `${g.rounds} ${p.rounds}`, 404, y, UI.dim);
      drawBeltIcon(s, 264, y + 13, p.beltIndex);
      drawText(s, `${g.belt} ${TEXT.belts[CONFIG.belts[p.beltIndex].id]}`, 296, y + 12, UI.text);
    });
    if (this.entering) {
      const p = this.entering;
      const y0 = 190;
      drawPanel(s, 90, y0, 460, 96);
      drawText(s, g.newHighscore, 320, y0 + 10, UI.gold, { align: 'center' });
      drawText(s, p.player === 0 ? TEXT.players.p1 : TEXT.players.p2, 320, y0 + 24, UI.text, { align: 'center' });
      const cw = 18;
      const x0 = 320 - (this.name.length * cw) / 2;
      this.name.forEach((ch, i) => {
        const x = x0 + i * cw;
        const sel = i === this.cursor;
        s.fillRect(x + 1, y0 + 58, cw - 4, 2, sel ? UI.gold : UI.edge);
        if (sel && (this.frame >> 3) % 2 === 0) s.fillRect(x + 1, y0 + 38, cw - 4, 19, UI.select);
        drawText(s, ch, x + cw / 2 - 1, y0 + 40, sel ? UI.gold : UI.text, { align: 'center', scale: 2 });
      });
      drawText(s, g.enterName, 320, y0 + 74, UI.dim, { align: 'center' });
    } else if (this.frame > 90 && (this.frame >> 5) % 2 === 0) {
      drawText(s, TEXT.results.continue, 320, 300, UI.text, { align: 'center' });
    }
  }
}
