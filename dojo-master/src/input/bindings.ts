/**
 * Tasten- und Gamepadbelegungen.
 * Tastatur wird über KeyboardEvent.code geprüft, damit die Belegung auf
 * deutschen und englischen Tastaturen an derselben physischen Stelle liegt.
 */

export type BindAction = 'up' | 'down' | 'left' | 'right' | 'punch' | 'kick' | 'block';

export const BIND_ACTIONS: BindAction[] = ['up', 'down', 'left', 'right', 'punch', 'kick', 'block'];

export type KeyBindings = Record<BindAction, string[]>;

export interface PadBindings {
  punch: number;
  kick: number;
  block: number;
  pause: number;
}

export const PAD_ACTIONS: (keyof PadBindings)[] = ['punch', 'kick', 'block', 'pause'];

/**
 * Standardbelegung.
 * Spieler 1 links auf der Tastatur, Spieler 2 auf Pfeiltasten und Ziffernblock
 * (bzw. K, L, Ö). Die Gruppen liegen in getrennten Bereichen der Tastaturmatrix,
 * was Ghosting bei gleichzeitigem Drücken mehrerer Tasten weitgehend vermeidet.
 */
export function defaultKeyBindings(): [KeyBindings, KeyBindings] {
  return [
    {
      up: ['KeyW'],
      down: ['KeyS'],
      left: ['KeyA'],
      right: ['KeyD'],
      punch: ['KeyF'],
      kick: ['KeyG'],
      block: ['KeyH'],
    },
    {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      punch: ['Numpad1', 'KeyK'],
      kick: ['Numpad2', 'KeyL'],
      // „Semicolon“ ist auf deutschen Tastaturen die Taste Ö.
      block: ['Numpad3', 'Semicolon'],
    },
  ];
}

/** Standard-Gamepad (W3C „standard“ mapping): X/□ = Schlag, A/✕ = Tritt, B/○ = Abwehr, Start = Pause. */
export function defaultPadBindings(): [PadBindings, PadBindings] {
  return [
    { punch: 2, kick: 0, block: 1, pause: 9 },
    { punch: 2, kick: 0, block: 1, pause: 9 },
  ];
}

/** Tasten, die nicht frei belegt werden dürfen, weil sie Systemfunktionen haben. */
export const RESERVED_CODES = new Set(['Escape', 'F3', 'F9', 'KeyP', 'Enter', 'NumpadEnter', 'Space', 'Tab']);

const FALLBACK_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Semicolon: 'Ö',
  Quote: 'Ä',
  BracketLeft: 'Ü',
  Minus: 'ß',
  Equal: '´',
  Backquote: '^',
  Comma: ',',
  Period: '.',
  Slash: '-',
  Backslash: '#',
  IntlBackslash: '<',
  ShiftLeft: 'SHIFT L',
  ShiftRight: 'SHIFT R',
  ControlLeft: 'STRG L',
  ControlRight: 'STRG R',
  AltLeft: 'ALT',
  AltRight: 'ALT GR',
  Space: 'LEER',
  Enter: 'ENTER',
  Backspace: 'RÜCK',
  NumpadAdd: 'NUM +',
  NumpadSubtract: 'NUM -',
  NumpadMultiply: 'NUM *',
  NumpadDivide: 'NUM /',
  NumpadDecimal: 'NUM ,',
  NumpadEnter: 'NUM ENTER',
};

let layoutMap: Map<string, string> | null = null;

/** Lädt, wo verfügbar, die tatsächliche Tastaturbeschriftung (Chrome/Edge). */
export function loadKeyboardLayout(): void {
  try {
    const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    kb?.getLayoutMap?.()
      .then((m) => {
        layoutMap = m;
      })
      .catch(() => undefined);
  } catch {
    /* nicht unterstützt */
  }
}

export function keyLabel(code: string): string {
  if (code.startsWith('Numpad') && /^Numpad\d$/.test(code)) return 'NUM ' + code.slice(6);
  const fromLayout = layoutMap?.get(code);
  if (fromLayout && fromLayout.trim().length > 0 && !code.startsWith('Arrow')) return fromLayout.toUpperCase();
  if (FALLBACK_LABELS[code]) return FALLBACK_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.toUpperCase();
}

const PAD_LABELS = ['A/✕', 'B/○', 'X/□', 'Y/△', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3'];

export function padButtonLabel(index: number): string {
  const l = PAD_LABELS[index];
  if (!l) return 'TASTE ' + index;
  // Die Pixelschrift hat keine Playstation-Symbole; nur die Xbox-Bezeichnung zeigen.
  return l.split('/')[0];
}
