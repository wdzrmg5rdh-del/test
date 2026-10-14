import type { AttackId } from '../config';
import type { AnimId } from './animations';

/**
 * Frame-Daten aller Bewegungen und Angriffe (60 Frames = 1 Sekunde).
 * Punktwerte je Angriff stehen in config.ts (rules.attackPoints).
 */

export type HitHeight = 'hoch' | 'mittel' | 'tief';

/** Gelenk, an dem die Trefferzone eines Angriffs sitzt. */
export type Striker = 'handN' | 'handF' | 'footN' | 'head';

/** Parabelflug: beginnt im Frame `start`, dauert `frames`, erreicht `height` Pixel und legt `dist` Pixel (vorwärts positiv) zurück. */
export interface AirArc {
  start: number;
  frames: number;
  height: number;
  dist: number;
}

export interface AttackDef {
  id: AttackId;
  anim: AnimId;
  startup: number;
  active: number;
  recovery: number;
  height: HitHeight;
  striker: Striker;
  /** Radius der Trefferzone in Pixeln. */
  hitRadius: number;
  /** Ungefähre Reichweite (Abstand der Trefferzone zur Körpermitte); dient der KI zur Angriffswahl. */
  reach: number;
  /** Trifft hinter dem Kämpfer stehende Gegner. */
  backward: boolean;
  /** Vorwärtsbewegung während des Anlaufs in Pixeln. */
  lunge: number;
  air?: AirArc;
  /** Ton beim Ausführen ins Leere. */
  swing: 'punch' | 'kick';
}

export const ATTACKS: Record<AttackId, AttackDef> = {
  fauststossHoch: {
    id: 'fauststossHoch', anim: 'fauststossHoch', startup: 6, active: 4, recovery: 12,
    height: 'hoch', striker: 'handN', hitRadius: 3.5, reach: 38, backward: false, lunge: 4, swing: 'punch',
  },
  fauststossTief: {
    id: 'fauststossTief', anim: 'fauststossTief', startup: 7, active: 4, recovery: 14,
    height: 'tief', striker: 'handN', hitRadius: 3.5, reach: 40, backward: false, lunge: 2, swing: 'punch',
  },
  kopfstoss: {
    id: 'kopfstoss', anim: 'kopfstoss', startup: 8, active: 4, recovery: 14,
    height: 'hoch', striker: 'head', hitRadius: 5, reach: 30, backward: false, lunge: 5, swing: 'punch',
  },
  frontTritt: {
    id: 'frontTritt', anim: 'frontTritt', startup: 9, active: 5, recovery: 15,
    height: 'mittel', striker: 'footN', hitRadius: 4.5, reach: 48, backward: false, lunge: 2, swing: 'kick',
  },
  hoherTritt: {
    id: 'hoherTritt', anim: 'hoherTritt', startup: 12, active: 5, recovery: 18,
    height: 'hoch', striker: 'footN', hitRadius: 4.5, reach: 40, backward: false, lunge: 3, swing: 'kick',
  },
  halbkreisTritt: {
    id: 'halbkreisTritt', anim: 'halbkreisTritt', startup: 18, active: 6, recovery: 22,
    height: 'hoch', striker: 'footN', hitRadius: 5, reach: 44, backward: false, lunge: 6, swing: 'kick',
  },
  fussfeger: {
    id: 'fussfeger', anim: 'fussfeger', startup: 12, active: 6, recovery: 18,
    height: 'tief', striker: 'footN', hitRadius: 5, reach: 46, backward: false, lunge: 0, swing: 'kick',
  },
  flugTritt: {
    id: 'flugTritt', anim: 'flugTritt', startup: 8, active: 14, recovery: 16,
    height: 'hoch', striker: 'footN', hitRadius: 5, reach: 100, backward: false, lunge: 0, swing: 'kick',
    air: { start: 5, frames: 25, height: 34, dist: 74 },
  },
  trittHinten: {
    id: 'trittHinten', anim: 'trittHinten', startup: 14, active: 6, recovery: 20,
    height: 'mittel', striker: 'footN', hitRadius: 5, reach: 44, backward: true, lunge: -3, swing: 'kick',
  },
  fauststossHinten: {
    id: 'fauststossHinten', anim: 'fauststossHinten', startup: 10, active: 4, recovery: 16,
    height: 'hoch', striker: 'handF', hitRadius: 3.5, reach: 36, backward: true, lunge: -2, swing: 'punch',
  },
};

export const ATTACK_IDS = Object.keys(ATTACKS) as AttackId[];

/** Bewegungen ohne Trefferwirkung. */
export const MOVEMENT = {
  /** Schrittgeschwindigkeit vorwärts/rückwärts in Pixel pro Frame. */
  walkForward: 1.5,
  walkBack: 1.2,
  jump: { start: 5, frames: 26, height: 50, dist: 0 } as AirArc,
  saltoVor: { start: 5, frames: 36, height: 54, dist: 92 } as AirArc,
  saltoRueck: { start: 5, frames: 36, height: 50, dist: -84 } as AirArc,
  /** Frame der Umdrehung, in dem die Blickrichtung wechselt. */
  turnFlipFrame: 5,
  /** Zurückweichen bei abgewehrtem Angriff (Pixel pro Frame über die Abwehrstarre). */
  blockPushback: 0.6,
  staggerPushback: 0.9,
  knockdownPushback: 1.4,
};
