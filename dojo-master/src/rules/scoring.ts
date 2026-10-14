import { CONFIG, type TieRule } from '../config';
import type { Rng } from '../core/rng';
import type { Fighter } from '../fighter/fighter';

/**
 * Rangfolge nach Rundenpunkten. Gleichstände werden nach der konfigurierten
 * Regel aufgelöst; lässt sich ein Gleichstand damit nicht entscheiden (z. B.
 * weil beide nie gepunktet haben), entscheidet das Los (seedbarer Zufall).
 */
export function rankFighters(fighters: readonly Fighter[], rule: TieRule, rng: Rng): Fighter[] {
  const lots = new Map<Fighter, number>();
  for (const f of fighters) lots.set(f, rng.next());
  const never = (t: number) => (t < 0 ? Infinity : t);
  return [...fighters].sort((a, b) => {
    if (a.roundPoints !== b.roundPoints) return b.roundPoints - a.roundPoints;
    if (rule === 'zuletztGepunktet' && a.lastScoreTick !== b.lastScoreTick) return b.lastScoreTick - a.lastScoreTick;
    if (rule === 'zuerstGepunktet' && never(a.firstScoreTick) !== never(b.firstScoreTick))
      return never(a.firstScoreTick) - never(b.firstScoreTick);
    return lots.get(a)! - lots.get(b)!;
  });
}

/** Gürtelstufe (Index in CONFIG.belts) zu einer Gesamtpunktzahl. */
export function beltForScore(score: number): number {
  let idx = 0;
  CONFIG.belts.forEach((b, i) => {
    if (score >= b.minScore) idx = i;
  });
  return idx;
}

/** Gesamtpunkte für Rundenpunkte (halbe Punkte). */
export function scoreForRoundPoints(halves: number): number {
  return halves * CONFIG.rules.scorePerHalfPoint;
}

export function timeBonus(remainingFrames: number): number {
  return Math.ceil(remainingFrames / 60) * CONFIG.rules.timeBonusPerSecond;
}
