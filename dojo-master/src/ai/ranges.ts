import { findCandidates } from '../combat/collision';
import type { AttackId } from '../config';
import { EventSink } from '../core/events';
import { ATTACKS, ATTACK_IDS } from '../data/moves';
import { Fighter } from '../fighter/fighter';
import { emptyInput } from '../input/types';

/**
 * Wirksame Reichweiten der Angriffe, einmalig durch Simulation aus den
 * Pose- und Frame-Daten ermittelt. Die KI nutzt sie zur Angriffswahl und zur
 * Einschätzung gegnerischer Angriffe.
 */
export interface RangeInfo {
  min: number;
  max: number;
  /** Reichweite gegen geduckte Gegner (null = trifft geduckte nicht). */
  lowMin: number | null;
  lowMax: number | null;
}

let cache: Record<AttackId, RangeInfo> | null = null;

function measure(id: AttackId, crouch: boolean): [number, number] | null {
  const def = ATTACKS[id];
  let lo = Infinity, hi = -Infinity;
  for (let d = 22; d <= 130; d += 2) {
    const ev = new EventSink();
    const a = new Fighter(0, 'weiss', 300, 1, ev);
    const tx = def.backward ? 300 - d : 300 + d;
    const b = new Fighter(1, 'rot', tx, tx > 300 ? -1 : 1, ev);
    const bIn = { ...emptyInput(), y: crouch ? (1 as const) : (0 as const) };
    for (let i = 0; i < 6; i++) b.update(bIn);
    a.startAttack(def);
    for (let i = 0; i < 80 && a.state === 'attack'; i++) {
      a.update(emptyInput());
      b.update(bIn);
      if (findCandidates([a, b]).some((c) => c.attacker === a)) {
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
        break;
      }
    }
  }
  return lo === Infinity ? null : [lo, hi];
}

export function attackRanges(): Record<AttackId, RangeInfo> {
  if (cache) return cache;
  const out = {} as Record<AttackId, RangeInfo>;
  for (const id of ATTACK_IDS) {
    const st = measure(id, false) ?? [0, 0];
    const low = measure(id, true);
    out[id] = { min: st[0], max: st[1], lowMin: low ? low[0] : null, lowMax: low ? low[1] : null };
  }
  cache = out;
  return out;
}
