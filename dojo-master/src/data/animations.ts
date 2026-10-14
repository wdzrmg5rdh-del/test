import type { PoseId } from './poses';

/**
 * Animationen als Folge von Schlüsselposen.
 *
 * dur:   Anzahl Frames, die der Schlüssel dauert.
 * blend: In so vielen Frames wird von der vorherigen Pose zu dieser überblendet,
 *        danach wird die Pose gehalten. Kleine Werte ergeben harte, kräftige
 *        Posenwechsel wie bei klassischer Sprite-Animation.
 *
 * Bei Angriffen entspricht die Summe der Schlüssel exakt Anlauf + aktive Phase +
 * Erholung aus data/moves.ts (wird beim Start geprüft).
 */
export interface KeyFrame {
  pose: PoseId;
  dur: number;
  blend?: number;
}

export interface AnimDef {
  keys: KeyFrame[];
  loop?: boolean;
}

const k = (pose: PoseId, dur: number, blend = 2): KeyFrame => ({ pose, dur, blend });

export const ANIMS = {
  idle: { keys: [k('stance', 40, 4), k('stanceBreath', 40, 10)], loop: true },
  ready: { keys: [k('ready', 1, 6)], loop: true },
  walkF: { keys: [k('walk2', 8, 3), k('walk1', 8, 3), k('walk3', 8, 3), k('walk1', 8, 3)], loop: true },
  walkB: { keys: [k('walk3', 9, 3), k('walk1', 9, 3), k('walk2', 9, 3), k('walk1', 9, 3)], loop: true },
  crouch: { keys: [k('crouch', 1, 3)], loop: true },
  blockHigh: { keys: [k('blockHigh', 1, 2)], loop: true },
  blockLow: { keys: [k('blockLow', 1, 2)], loop: true },
  blockStun: { keys: [k('blockShock', 4, 1), k('blockHigh', 8, 3)] },
  blockStunLow: { keys: [k('crouch', 4, 1), k('blockLow', 8, 3)] },
  turn: { keys: [k('turn', 5, 2), k('stance', 5, 2)] },

  jump: { keys: [k('jumpCrouch', 5, 2), k('jumpAir', 26, 5), k('land', 6, 1)] },
  saltoVor: {
    keys: [
      k('jumpCrouch', 5, 2),
      k('tuck0', 4, 3),
      k('tuck90', 8, 8),
      k('tuck180', 8, 8),
      k('tuck270', 8, 8),
      k('tuck0', 8, 8),
      k('land', 6, 1),
    ],
  },
  saltoRueck: {
    keys: [
      k('jumpCrouch', 5, 2),
      k('tuck0', 4, 3),
      k('tuckM90', 8, 8),
      k('tuckM180', 8, 8),
      k('tuckM270', 8, 8),
      k('tuck0', 8, 8),
      k('land', 6, 1),
    ],
  },

  // Angriffe (Anlauf | aktiv | Erholung)
  fauststossHoch: { keys: [k('punchHighWind', 6, 3), k('punchHigh', 4, 1), k('punchHigh', 4), k('stance', 8, 4)] },
  fauststossTief: { keys: [k('crouchPunchWind', 7, 3), k('crouchPunch', 4, 1), k('crouchPunch', 4), k('crouch', 10, 4)] },
  kopfstoss: { keys: [k('headbuttWind', 8, 4), k('headbutt', 4, 1), k('headbutt', 3), k('stance', 11, 5)] },
  frontTritt: { keys: [k('frontKickWind', 9, 4), k('frontKick', 5, 1), k('frontKickWind', 6, 3), k('stance', 9, 4)] },
  hoherTritt: {
    keys: [k('highKickWind', 12, 5), k('highKick', 5, 1), k('highKick', 3), k('highKickWind', 6, 3), k('stance', 9, 4)],
  },
  halbkreisTritt: {
    keys: [
      k('roundWind1', 7, 3),
      k('turn', 5, 2),
      k('roundWind2', 6, 3),
      k('roundKick', 6, 1),
      k('roundKick', 4),
      k('roundWind2', 6, 3),
      k('stance', 12, 5),
    ],
  },
  fussfeger: { keys: [k('sweepWind', 12, 5), k('sweep', 6, 1), k('sweep', 4), k('sweepWind', 6, 3), k('crouch', 8, 4)] },
  flugTritt: {
    keys: [
      k('jumpCrouch', 5, 3),
      k('flyKickAir1', 3, 2),
      k('flyKick', 14, 2),
      k('flyKickAir1', 6, 3),
      k('land', 6, 1),
      k('stance', 4, 3),
    ],
  },
  trittHinten: {
    keys: [k('backKickWind', 14, 5), k('backKick', 6, 1), k('backKick', 4), k('backKickWind', 8, 3), k('stance', 8, 4)],
  },
  fauststossHinten: { keys: [k('backPunchWind', 10, 4), k('backPunch', 4, 1), k('backPunch', 4), k('stance', 12, 5)] },

  // Reaktionen
  stagger: { keys: [k('stagger1', 6, 2), k('stagger2', 10, 4), k('stagger1', 8, 4), k('stance', 10, 5)] },
  knockdown: { keys: [k('stagger1', 4, 1), k('fall1', 8, 4), k('lying', 58, 4)] },
  bow: { keys: [k('ready', 10, 4), k('bow', 30, 6), k('ready', 20, 6)] },
  victory: { keys: [k('victory', 20, 4), k('victory2', 20, 4)], loop: true },
  defeat: { keys: [k('defeat', 1, 8)], loop: true },

  // Bonusrunde
  shieldHigh: { keys: [k('shieldHigh', 1, 2)], loop: true },
  shieldMid: { keys: [k('shieldMid', 1, 2)], loop: true },
  shieldLow: { keys: [k('shieldLow', 1, 2)], loop: true },
  shieldJump: { keys: [k('jumpCrouch', 4, 2), k('shieldJump', 26, 4), k('land', 6, 1)] },
  shieldHit: { keys: [k('shieldHit', 8, 1), k('stagger2', 16, 4), k('shieldMid', 16, 6)] },
} satisfies Record<string, AnimDef>;

export type AnimId = keyof typeof ANIMS;

export function animLength(id: AnimId): number {
  let n = 0;
  for (const key of (ANIMS[id] as AnimDef).keys) n += key.dur;
  return n;
}
