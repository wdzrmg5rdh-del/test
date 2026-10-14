import type { AttackId } from '../config';
import type { ActionButton, RelDir } from '../input/types';

/**
 * Zuordnungstabelle Richtung × Aktionstaste → Aktion.
 * Richtungen sind relativ zur Blickrichtung: F = vorwärts, B = rückwärts,
 * U = oben, D = unten, N = keine Richtung.
 */

export type MoveAction = 'stehen' | 'schrittVor' | 'schrittZurueck' | 'sprung' | 'saltoVor' | 'saltoRueck' | 'ducken';
export type ButtonAction = AttackId | 'abwehrHoch' | 'abwehrTief' | 'umdrehen';

/** Bewegung, wenn nur eine Richtung (ohne Aktionstaste) gehalten wird. */
export const MOVE_TABLE: Record<RelDir, MoveAction> = {
  N: 'stehen',
  F: 'schrittVor',
  B: 'schrittZurueck',
  U: 'sprung',
  UF: 'saltoVor',
  UB: 'saltoRueck',
  D: 'ducken',
  DF: 'ducken',
  DB: 'ducken',
};

export const BUTTON_TABLE: Record<ActionButton, Record<RelDir, ButtonAction>> = {
  punch: {
    N: 'fauststossHoch',
    F: 'fauststossHoch',
    U: 'kopfstoss',
    UF: 'kopfstoss',
    D: 'fauststossTief',
    DF: 'fauststossTief',
    DB: 'fauststossTief',
    B: 'fauststossHinten',
    UB: 'fauststossHinten',
  },
  kick: {
    N: 'frontTritt',
    F: 'frontTritt',
    U: 'hoherTritt',
    UF: 'flugTritt',
    UB: 'halbkreisTritt',
    D: 'fussfeger',
    DF: 'fussfeger',
    DB: 'fussfeger',
    B: 'trittHinten',
  },
  block: {
    N: 'abwehrHoch',
    F: 'abwehrHoch',
    U: 'abwehrHoch',
    UF: 'abwehrHoch',
    D: 'abwehrTief',
    DF: 'abwehrTief',
    DB: 'abwehrTief',
    B: 'umdrehen',
    UB: 'umdrehen',
  },
};

/** Reihenfolge der Richtungen auf dem Steuerungsbildschirm, mit Pfeilsymbol (Blickrichtung rechts). */
export const DIR_ORDER: { dir: RelDir; symbol: string }[] = [
  { dir: 'N', symbol: '·' },
  { dir: 'F', symbol: '→' },
  { dir: 'B', symbol: '←' },
  { dir: 'U', symbol: '↑' },
  { dir: 'D', symbol: '↓' },
  { dir: 'UF', symbol: '↗' },
  { dir: 'UB', symbol: '↖' },
  { dir: 'DF', symbol: '↘' },
  { dir: 'DB', symbol: '↙' },
];
