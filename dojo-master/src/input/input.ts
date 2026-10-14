import { CONFIG } from '../config';
import {
  BIND_ACTIONS,
  defaultKeyBindings,
  defaultPadBindings,
  type KeyBindings,
  type PadBindings,
} from './bindings';
import { emptyInput, type FrameInput, type MenuInput } from './types';

/**
 * Sammelt Tastatur- und Gamepadeingaben und stellt sie pro Logikschritt bereit.
 *
 * Tastendrücke, die zwischen zwei Logikschritten beginnen und enden, gehen
 * nicht verloren: Sie werden bis zum nächsten Abtasten vorgemerkt.
 */
export class InputManager {
  keyBindings: [KeyBindings, KeyBindings] = defaultKeyBindings();
  padBindings: [PadBindings, PadBindings] = defaultPadBindings();

  private readonly down = new Set<string>();
  private readonly tapped = new Set<string>();
  private prevPlayer: [FrameInput, FrameInput] = [emptyInput(), emptyInput()];
  private prevMenu = { up: false, down: false, left: false, right: false, confirm: false, back: false, pause: false };
  private repeatTimer = { up: 0, down: 0, left: 0, right: 0 };
  private pads: (Gamepad | null)[] = [null, null];

  /** Wird bei jedem keydown aufgerufen (z. B. um Audio freizuschalten). */
  onAnyKey: ((e: KeyboardEvent) => void) | null = null;
  /** Wenn gesetzt, wird der nächste Tastendruck abgefangen (Tastenbelegung ändern). */
  captureKey: ((code: string) => void) | null = null;
  /** Zuletzt gedrückter Gamepadknopf (für die Neubelegung). */
  lastPadButton: { pad: number; button: number } | null = null;
  /** Zuletzt eingegebene Zeichen für die Namenseingabe. */
  readonly typed: string[] = [];

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => this.onKeyDown(e));
    target.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    target.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.onAnyKey?.(e);
    if (this.captureKey) {
      e.preventDefault();
      const cb = this.captureKey;
      this.captureKey = null;
      cb(e.code);
      return;
    }
    // Standardaktionen des Browsers (Scrollen, Schnellsuche) unterbinden,
    // aber Browser-Tastenkürzel mit Strg/Cmd zulassen.
    if (!e.ctrlKey && !e.metaKey && !/^F(5|11|12)$/.test(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.down.add(e.code);
    this.tapped.add(e.code);
    if (e.key.length === 1) this.typed.push(e.key);
    else if (e.key === 'Backspace') this.typed.push('\b');
  }

  isDown(code: string): boolean {
    return this.down.has(code) || this.tapped.has(code);
  }

  /** Wurde die Taste seit dem letzten Logikschritt neu gedrückt? */
  wasTapped(code: string): boolean {
    return this.tapped.has(code);
  }

  /** Muss einmal pro Logikschritt vor dem Abfragen aufgerufen werden. */
  poll(): void {
    this.pads = [null, null];
    const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let n = 0;
    for (const gp of list) {
      if (!gp || !gp.connected) continue;
      if (n < 2) this.pads[n] = gp;
      for (let b = 0; b < gp.buttons.length; b++) {
        if (gp.buttons[b].pressed && !this.padPrev[gp.index]?.[b]) this.lastPadButton = { pad: n, button: b };
      }
      this.padPrev[gp.index] = gp.buttons.map((b) => b.pressed);
      n++;
    }
  }
  private padPrev: boolean[][] = [];

  connectedPads(): number {
    return this.pads.filter((p) => p !== null).length;
  }

  private padHeld(player: number): { x: number; y: number; punch: boolean; kick: boolean; block: boolean; pause: boolean } {
    const gp = this.pads[player];
    const res = { x: 0, y: 0, punch: false, kick: false, block: false, pause: false };
    if (!gp) return res;
    const btn = (i: number) => gp.buttons[i]?.pressed ?? false;
    const dz = CONFIG.input.stickDeadzone;
    const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
    if (btn(14) || ax < -dz) res.x = -1;
    if (btn(15) || ax > dz) res.x = 1;
    if (btn(12) || ay < -dz) res.y = -1;
    if (btn(13) || ay > dz) res.y = 1;
    const b = this.padBindings[player];
    res.punch = btn(b.punch);
    res.kick = btn(b.kick);
    res.block = btn(b.block);
    res.pause = btn(b.pause);
    return res;
  }

  /** Liefert die Eingaben von Spieler 0 oder 1 für diesen Logikschritt. */
  sample(player: 0 | 1): FrameInput {
    const kb = this.keyBindings[player];
    const any = (codes: string[]) => codes.some((c) => this.isDown(c));
    const pad = this.padHeld(player);
    const left = any(kb.left) || pad.x < 0;
    const right = any(kb.right) || pad.x > 0;
    const up = any(kb.up) || pad.y < 0;
    const downK = any(kb.down) || pad.y > 0;
    const punch = any(kb.punch) || pad.punch;
    const kick = any(kb.kick) || pad.kick;
    const block = any(kb.block) || pad.block;
    const prev = this.prevPlayer[player];
    const tappedAny = (codes: string[]) => codes.some((c) => this.tapped.has(c));
    const cur: FrameInput = {
      x: left === right ? 0 : left ? -1 : 1,
      y: up === downK ? 0 : up ? -1 : 1,
      punch,
      kick,
      block,
      punchPressed: (punch && !prev.punch) || tappedAny(kb.punch),
      kickPressed: (kick && !prev.kick) || tappedAny(kb.kick),
      blockPressed: (block && !prev.block) || tappedAny(kb.block),
    };
    this.prevPlayer[player] = cur;
    return cur;
  }

  /** Menüeingaben aller Geräte zusammengefasst, mit Wiederholung bei gehaltener Richtung. */
  sampleMenu(useBindings = true): MenuInput {
    const k = (codes: string[]) => codes.some((c) => this.isDown(c));
    const none = { up: [], down: [], left: [], right: [], punch: [], kick: [], block: [] };
    const kb0 = useBindings ? this.keyBindings[0] : none;
    const kb1 = useBindings ? this.keyBindings[1] : none;
    const p0 = this.padHeld(0), p1 = this.padHeld(1);
    const held = {
      up: k(kb0.up) || k(kb1.up) || k(['ArrowUp']) || p0.y < 0 || p1.y < 0,
      down: k(kb0.down) || k(kb1.down) || k(['ArrowDown']) || p0.y > 0 || p1.y > 0,
      left: k(kb0.left) || k(kb1.left) || k(['ArrowLeft']) || p0.x < 0 || p1.x < 0,
      right: k(kb0.right) || k(kb1.right) || k(['ArrowRight']) || p0.x > 0 || p1.x > 0,
      confirm:
        k(['Enter', 'NumpadEnter', 'Space']) || k(kb0.punch) || k(kb1.punch) || this.padBtn(0, 0) || this.padBtn(1, 0),
      back: k(['Escape']) || this.padBtn(0, 1) || this.padBtn(1, 1),
      pause: k(['Escape']) || (useBindings && k(['KeyP'])) || p0.pause || p1.pause,
    };
    const prev = this.prevMenu;
    const res: MenuInput = {
      up: false,
      down: false,
      left: false,
      right: false,
      confirm: held.confirm && !prev.confirm,
      back: held.back && !prev.back,
      pause: held.pause && !prev.pause,
    };
    for (const d of ['up', 'down', 'left', 'right'] as const) {
      if (held[d] && !prev[d]) {
        res[d] = true;
        this.repeatTimer[d] = 0;
      } else if (held[d]) {
        this.repeatTimer[d]++;
        if (this.repeatTimer[d] > 22 && this.repeatTimer[d] % 6 === 0) res[d] = true;
      }
    }
    this.prevMenu = held;
    return res;
  }

  private padBtn(player: number, button: number): boolean {
    return this.pads[player]?.buttons[button]?.pressed ?? false;
  }

  /** Muss am Ende jedes Logikschritts aufgerufen werden. */
  endFrame(): void {
    this.tapped.clear();
    this.typed.length = 0;
  }

  /** Setzt Flankenerkennung zurück, damit gehaltene Tasten nach einem Zustandswechsel nicht erneut auslösen. */
  resetEdges(): void {
    for (const p of [0, 1] as const) {
      const pr = this.prevPlayer[p];
      pr.punch = pr.kick = pr.block = true;
    }
    this.prevMenu = { up: true, down: true, left: true, right: true, confirm: true, back: true, pause: true };
    this.tapped.clear();
  }

  /** Prüft, ob zwei Aktionen dieselbe Taste verwenden (Hilfsfunktion für das Optionsmenü). */
  findConflicts(player: 0 | 1): string[] {
    const seen = new Map<string, string>();
    const conflicts: string[] = [];
    for (const p of [0, 1]) {
      for (const a of BIND_ACTIONS) {
        for (const c of this.keyBindings[p][a]) {
          const prev = seen.get(c);
          if (prev && (p === player || prev.startsWith(String(player)))) conflicts.push(c);
          seen.set(c, `${p}:${a}`);
        }
      }
    }
    return conflicts;
  }
}
