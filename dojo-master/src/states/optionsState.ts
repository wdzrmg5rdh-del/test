import { Screen } from '../core/screen';
import type { Game } from '../core/game';
import {
  BIND_ACTIONS,
  defaultKeyBindings,
  defaultPadBindings,
  keyLabel,
  PAD_ACTIONS,
  padButtonLabel,
  RESERVED_CODES,
  type BindAction,
  type PadBindings,
} from '../input/bindings';
import { drawBackground } from '../render/background';
import { drawText } from '../render/font';
import { drawMenu, drawPanel, drawTitle, UI, type MenuItem } from '../render/menu';
import type { Surface } from '../render/surface';
import { TEXT } from '../texts';
import type { GameState } from './state';

/** Gemeinsame Grundlage der Menüs mit Auswahlliste und Hintergrund. */
abstract class ListMenu implements GameState {
  protected sel = 0;
  protected frame = 0;
  protected note: { text: string; frames: number } | null = null;

  constructor(
    protected readonly game: Game,
    protected readonly back: GameState,
  ) {}

  protected abstract items(): MenuItem[];
  protected abstract activate(index: number, dir: -1 | 0 | 1): void;
  protected abstract title(): string;

  /** Eingabe gesperrt (z. B. während auf eine Taste gewartet wird). */
  protected busy(): boolean {
    return false;
  }

  update(): void {
    this.frame++;
    if (this.note && --this.note.frames <= 0) this.note = null;
    if (this.busy()) {
      this.busyUpdate();
      return;
    }
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
    if (m.left) this.activate(this.sel, -1);
    if (m.right) this.activate(this.sel, 1);
    if (m.confirm) {
      this.game.audio.play(['menueBestaetigen']);
      this.activate(this.sel, 0);
    }
    if (m.back) {
      this.game.audio.play(['menue']);
      this.game.setState(this.back);
    }
  }

  protected busyUpdate(): void {}

  render(s: Surface): void {
    drawBackground(s, this.frame);
    s.ditherRect(0, 0, 640, 360, UI.ink);
    drawTitle(s, this.title(), 22);
    const items = this.items();
    const h = items.length * 14 + 16;
    drawPanel(s, 150, 56, 340, h);
    drawMenu(s, items, this.sel, 320, 66, 324, this.frame);
    if (this.note) drawText(s, this.note.text, 320, 64 + h + 8, UI.accent, { align: 'center', shadow: UI.ink });
    drawText(s, TEXT.menu.hintNavigate, 320, 344, UI.text, { align: 'center', shadow: UI.ink });
  }
}

/** Optionsmenü: Lautstärke, Ton, Vollbild, Tasten- und Gamepadbelegung. */
export class OptionsState extends ListMenu {
  protected title(): string {
    return TEXT.options.title;
  }

  protected items(): MenuItem[] {
    const o = TEXT.options;
    const st = this.game.settings;
    return [
      { label: o.volume, value: `< ${Math.round(st.volume * 10)} >` },
      { label: o.sound, value: st.muted ? o.off : o.on },
      { label: o.fullscreen, value: Screen.isFullscreen() ? o.on : o.off },
      { label: o.keysP1 },
      { label: o.keysP2 },
      { label: o.padP1 },
      { label: o.padP2 },
      { label: o.defaults },
      { label: TEXT.menu.back },
    ];
  }

  protected activate(i: number, dir: -1 | 0 | 1): void {
    const st = this.game.settings;
    switch (i) {
      case 0: {
        const v = Math.round(st.volume * 10) + (dir === 0 ? 1 : dir);
        st.volume = (((v % 11) + 11) % 11) / 10;
        this.game.saveSettings();
        this.game.audio.play(['punkt']);
        break;
      }
      case 1:
        st.muted = !st.muted;
        this.game.saveSettings();
        this.game.audio.play(['menueBestaetigen']);
        break;
      case 2:
        if (dir === 0) Screen.toggleFullscreen();
        break;
      case 3:
      case 4:
        if (dir === 0) this.game.setState(new KeyBindState(this.game, this, i === 3 ? 0 : 1));
        break;
      case 5:
      case 6:
        if (dir === 0) this.game.setState(new PadBindState(this.game, this, i === 5 ? 0 : 1));
        break;
      case 7:
        if (dir === 0) {
          st.keys = defaultKeyBindings();
          st.pads = defaultPadBindings();
          this.game.saveSettings();
          this.note = { text: TEXT.options.defaultsDone, frames: 120 };
        }
        break;
      case 8:
        if (dir === 0) this.game.setState(this.back);
        break;
    }
  }
}

/** Belegung der Tastatur für einen Spieler. */
class KeyBindState extends ListMenu {
  private waiting: BindAction | null = null;

  constructor(
    game: Game,
    back: GameState,
    private readonly player: 0 | 1,
  ) {
    super(game, back);
  }

  protected title(): string {
    return this.player === 0 ? TEXT.options.keysP1 : TEXT.options.keysP2;
  }

  protected items(): MenuItem[] {
    const kb = this.game.settings.keys[this.player];
    const items: MenuItem[] = BIND_ACTIONS.map((a) => ({
      label: TEXT.options.actions[a],
      value: this.waiting === a ? '...' : kb[a].map(keyLabel).join(' / '),
    }));
    items.push({ label: TEXT.menu.back });
    return items;
  }

  protected override busy(): boolean {
    return this.waiting !== null;
  }

  protected activate(i: number, dir: -1 | 0 | 1): void {
    if (dir !== 0) return;
    if (i >= BIND_ACTIONS.length) {
      this.game.setState(this.back);
      return;
    }
    const action = BIND_ACTIONS[i];
    this.waiting = action;
    this.note = { text: TEXT.options.pressNewKey, frames: 100000 };
    this.game.input.captureKey = (code) => {
      this.waiting = null;
      this.note = null;
      if (code === 'Escape') return;
      if (RESERVED_CODES.has(code)) {
        this.note = { text: TEXT.options.reserved, frames: 120 };
        return;
      }
      const keys = this.game.settings.keys;
      // Taste bei anderen Aktionen beider Spieler entfernen, damit keine Doppelbelegung entsteht
      for (const p of [0, 1] as const) {
        for (const a of BIND_ACTIONS) {
          if (p === this.player && a === action) continue;
          keys[p][a] = keys[p][a].filter((c) => c !== code);
        }
      }
      keys[this.player][action] = [code];
      this.game.saveSettings();
      this.game.audio.play(['menueBestaetigen']);
    };
  }

  override render(s: Surface): void {
    super.render(s);
    const kb = this.game.settings.keys[this.player];
    const empty = BIND_ACTIONS.filter((a) => kb[a].length === 0);
    if (empty.length > 0) {
      drawText(s, empty.map((a) => TEXT.options.actions[a]).join(', ') + ': –', 320, 330, UI.red, { align: 'center' });
    }
  }
}

/** Belegung der Gamepadknöpfe für einen Spieler. */
class PadBindState extends ListMenu {
  private waiting: keyof PadBindings | null = null;

  constructor(
    game: Game,
    back: GameState,
    private readonly player: 0 | 1,
  ) {
    super(game, back);
  }

  protected title(): string {
    return this.player === 0 ? TEXT.options.padP1 : TEXT.options.padP2;
  }

  protected items(): MenuItem[] {
    const pb = this.game.settings.pads[this.player];
    const items: MenuItem[] = PAD_ACTIONS.map((a) => ({
      label: TEXT.options.actions[a],
      value: this.waiting === a ? '...' : padButtonLabel(pb[a]),
    }));
    items.push({ label: TEXT.menu.back });
    return items;
  }

  protected override busy(): boolean {
    return this.waiting !== null;
  }

  protected override busyUpdate(): void {
    const inp = this.game.input;
    if (inp.wasTapped('Escape')) {
      this.waiting = null;
      this.note = null;
      return;
    }
    const b = inp.lastPadButton;
    if (b && b.pad === this.player && this.waiting) {
      this.game.settings.pads[this.player][this.waiting] = b.button;
      this.game.saveSettings();
      this.game.audio.play(['menueBestaetigen']);
      this.waiting = null;
      this.note = null;
      inp.resetEdges();
    }
  }

  protected activate(i: number, dir: -1 | 0 | 1): void {
    if (dir !== 0) return;
    if (i >= PAD_ACTIONS.length) {
      this.game.setState(this.back);
      return;
    }
    if (this.game.input.connectedPads() <= this.player) {
      this.note = { text: TEXT.options.noPad, frames: 120 };
      return;
    }
    this.waiting = PAD_ACTIONS[i];
    this.game.input.lastPadButton = null;
    this.note = { text: TEXT.options.pressNewButton, frames: 100000 };
  }
}
