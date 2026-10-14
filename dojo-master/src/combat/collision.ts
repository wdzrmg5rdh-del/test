import { CONFIG } from '../config';
import type { Fighter } from '../fighter/fighter';
import { BODY } from '../fighter/skeleton';

/**
 * Kollisionserkennung.
 *
 * Hurtboxes (Körperzonen) sind Kapseln um Kopf, Rumpf, Ober- und Unterschenkel
 * und ergeben sich aus der aktuellen Pose. Arme, Hände und Füße sind keine
 * Körperzonen. Die Hitbox (Trefferzone) eines Angriffs ist eine Kapsel am
 * schlagenden Glied (Faust/Unterarm, Fuß/Unterschenkel oder Kopf) und nur
 * während der aktiven Phase vorhanden.
 *
 * Zusätzlich gilt: Tiefe Angriffe treffen nur Gegner am Boden (Sprünge und
 * Saltos überspringen sie), hohe Angriffe gehen über geduckte Gegner hinweg.
 *
 * PRIORITÄTSREGEL, wenn in einem Frame mehrere Treffer möglich sind:
 *  1. Nicht abgewehrte Treffer gehen vor abgewehrten.
 *  2. Unter den nicht abgewehrten gewinnt der Angriff, dessen aktive Phase
 *     früher begonnen hat.
 *  3. Bei gleichem Beginn gewinnt der höhere Punktwert (ganzer vor halbem Punkt).
 *  4. Treffen sich danach immer noch zwei Kämpfer gegenseitig gleichwertig,
 *     zählt keiner der beiden Treffer („Gleichzeitig – kein Punkt“), beide
 *     Angriffe prallen ab.
 *  5. Ansonsten entscheidet die Startposition (links vor Mitte vor rechts).
 * Wer selbst getroffen wird, kann im selben Frame nicht punkten. Da der
 * Kampfrichter nach jedem Treffer unterbricht, wird pro Frame höchstens ein
 * Punkt vergeben. Abwehraktionen werden ausgewertet, sofern der Abwehrende
 * nicht gleichzeitig von hinten getroffen wird.
 */

export interface Capsule {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}

export function hurtCapsules(f: Fighter): Capsule[] {
  const k = f.skel;
  const cap = (a: { x: number; y: number }, b: { x: number; y: number }, r: number): Capsule => ({
    ax: a.x, ay: a.y, bx: b.x, by: b.y, r,
  });
  return [
    cap(k.head, k.head, BODY.headR),
    cap(k.hip, k.neck, BODY.torsoR),
    cap(k.hip, k.kneeN, BODY.thighR),
    cap(k.kneeN, k.ankleN, BODY.shinR),
    cap(k.hip, k.kneeF, BODY.thighR),
    cap(k.kneeF, k.ankleF, BODY.shinR),
  ];
}

/**
 * Trefferzone des laufenden Angriffs als Kapsel entlang des schlagenden
 * Gliedes (Unterarm bzw. Unterschenkel bis Fuß, beim Kopfstoß der Kopf),
 * oder null, wenn keine aktive Phase läuft. So treffen Angriffe auch auf
 * kurze Distanz, wenn die Faust bereits am Gegner vorbeireicht.
 */
export function strikeCapsule(f: Fighter): Capsule | null {
  const a = f.attack;
  if (!a || f.attackPhase !== 'active' || f.attackResolved) return null;
  const k = f.skel;
  const r = a.hitRadius;
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }, t: number) => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
  });
  switch (a.striker) {
    case 'handN': {
      const s0 = mid(k.elbowN, k.handN, 0);
      return { ax: s0.x, ay: s0.y, bx: k.handN.x, by: k.handN.y, r };
    }
    case 'handF': {
      const s0 = mid(k.elbowF, k.handF, 0);
      return { ax: s0.x, ay: s0.y, bx: k.handF.x, by: k.handF.y, r };
    }
    case 'head':
      return { ax: k.head.x, ay: k.head.y, bx: k.head.x, by: k.head.y, r };
    case 'footN': {
      const s0 = mid(k.kneeN, k.ankleN, 0.2);
      const s1 = mid(k.ankleN, k.toeN, 0.6);
      return { ax: s0.x, ay: s0.y, bx: s1.x, by: s1.y, r };
    }
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Quadrierter Abstand zweier Strecken (für Kapsel-Kapsel-Tests). */
function segSegDist2(p: Capsule, q: Capsule): number {
  const d1x = p.bx - p.ax, d1y = p.by - p.ay;
  const d2x = q.bx - q.ax, d2y = q.by - q.ay;
  const rx = p.ax - q.ax, ry = p.ay - q.ay;
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  const f = d2x * rx + d2y * ry;
  let s: number, t: number;
  if (a <= 1e-9 && e <= 1e-9) {
    s = t = 0;
  } else if (a <= 1e-9) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry;
    if (e <= 1e-9) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y;
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const dx = p.ax + d1x * s - (q.ax + d2x * t);
  const dy = p.ay + d1y * s - (q.ay + d2y * t);
  return dx * dx + dy * dy;
}

export function capsulesOverlap(p: Capsule, q: Capsule): boolean {
  const rr = p.r + q.r;
  return segSegDist2(p, q) <= rr * rr;
}

export interface HitCandidate {
  attacker: Fighter;
  defender: Fighter;
  blocked: boolean;
  points: number;
}

/** Sammelt alle möglichen Treffer dieses Frames. */
export function findCandidates(fighters: readonly Fighter[]): HitCandidate[] {
  const out: HitCandidate[] = [];
  for (const att of fighters) {
    const c = strikeCapsule(att);
    if (!c) continue;
    const a = att.attack!;
    for (const def of fighters) {
      if (def === att || def.isHurt) continue;
      // Tiefe Angriffe (auch der Fußfeger) treffen nur Gegner, die am Boden stehen.
      if (a.height === 'tief' && !def.grounded) continue;
      // Hohe Angriffe gehen über geduckte Gegner hinweg.
      if (a.height === 'hoch' && def.isLow) continue;
      if (!hurtCapsules(def).some((cap) => capsulesOverlap(c, cap))) continue;
      out.push({
        attacker: att,
        defender: def,
        blocked: def.guardCovers(a.height, att.x),
        points: CONFIG.rules.attackPoints[a.id],
      });
    }
  }
  return out;
}

export interface ExchangeResult {
  hit: HitCandidate | null;
  blocked: HitCandidate[];
  clash: [Fighter, Fighter] | null;
}

/** Wendet die Prioritätsregel an (siehe Kommentar oben). */
export function resolveExchange(cands: HitCandidate[]): ExchangeResult {
  const clean = cands.filter((c) => !c.blocked);
  clean.sort(
    (p, q) =>
      p.attacker.activeSince - q.attacker.activeSince ||
      q.points - p.points ||
      p.attacker.slot - q.attacker.slot,
  );
  let hit: HitCandidate | null = null;
  let clash: [Fighter, Fighter] | null = null;
  if (clean.length > 0) {
    const best = clean[0];
    const mutual = clean.find(
      (c) =>
        c.attacker === best.defender &&
        c.defender === best.attacker &&
        c.attacker.activeSince === best.attacker.activeSince &&
        c.points === best.points,
    );
    if (mutual) clash = [best.attacker, best.defender];
    else hit = best;
  }
  const busy = new Set<Fighter>();
  if (hit) busy.add(hit.defender).add(hit.attacker);
  if (clash) busy.add(clash[0]).add(clash[1]);
  const blocked: HitCandidate[] = [];
  for (const c of cands) {
    if (!c.blocked || busy.has(c.defender) || busy.has(c.attacker)) continue;
    blocked.push(c);
    busy.add(c.attacker);
  }
  return { hit, blocked, clash };
}

/** Kämpfer können sich nicht durchdringen und die Kampffläche nicht verlassen. */
export function separateFighters(fighters: readonly Fighter[]): void {
  const hw = CONFIG.arena.bodyHalfWidth;
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < fighters.length; i++) {
      for (let j = i + 1; j < fighters.length; j++) {
        const a = fighters[i], b = fighters[j];
        const dx = b.x - a.x;
        const overlap = 2 * hw - Math.abs(dx);
        if (overlap <= 0) continue;
        const dir = dx !== 0 ? Math.sign(dx) : a.slot < b.slot ? 1 : -1;
        a.x -= (dir * overlap) / 2;
        b.x += (dir * overlap) / 2;
      }
    }
    for (const f of fighters) f.x = Math.max(CONFIG.arena.minX, Math.min(CONFIG.arena.maxX, f.x));
  }
  for (const f of fighters) f.refreshSkeleton();
}
