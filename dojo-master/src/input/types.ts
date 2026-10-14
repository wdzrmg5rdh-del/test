/** Gehaltene und neu gedrückte Eingaben eines Spielers in einem Logikschritt (absolut, nicht blickrichtungsbezogen). */
export interface FrameInput {
  /** -1 = links, 0 = keine, 1 = rechts */
  x: -1 | 0 | 1;
  /** -1 = oben, 0 = keine, 1 = unten */
  y: -1 | 0 | 1;
  punch: boolean;
  kick: boolean;
  block: boolean;
  punchPressed: boolean;
  kickPressed: boolean;
  blockPressed: boolean;
}

export function emptyInput(): FrameInput {
  return {
    x: 0,
    y: 0,
    punch: false,
    kick: false,
    block: false,
    punchPressed: false,
    kickPressed: false,
    blockPressed: false,
  };
}

/** Richtung relativ zur Blickrichtung des Kämpfers. */
export type RelDir = 'N' | 'F' | 'B' | 'U' | 'D' | 'UF' | 'UB' | 'DF' | 'DB';

export type ActionButton = 'punch' | 'kick' | 'block';

export function toRelDir(x: number, y: number, facing: 1 | -1): RelDir {
  const fx = x * facing;
  if (y < 0) return fx > 0 ? 'UF' : fx < 0 ? 'UB' : 'U';
  if (y > 0) return fx > 0 ? 'DF' : fx < 0 ? 'DB' : 'D';
  return fx > 0 ? 'F' : fx < 0 ? 'B' : 'N';
}

/** Eingaben zur Menüsteuerung (Flanken, mit Tastenwiederholung für Richtungen). */
export interface MenuInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  back: boolean;
  pause: boolean;
}
