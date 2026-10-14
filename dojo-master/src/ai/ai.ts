import type { AiLevel, AttackId } from '../config';
import type { Rng } from '../core/rng';
import { BUTTON_TABLE } from '../data/controls';
import { ATTACKS, ATTACK_IDS, type HitHeight } from '../data/moves';
import type { Fighter, FighterState } from '../fighter/fighter';
import { emptyInput, type FrameInput, type RelDir } from '../input/types';
import type { Controller } from './controller';
import { attackRanges } from './ranges';

/**
 * KI-Gegner als Zustandsautomat.
 *
 * Zustände: Abwarten, Annähern, Abstand halten, Angreifen, Abwehren, Ausweichen.
 * Die KI sieht von den anderen Kämpfern nur, was auf dem Bildschirm sichtbar
 * ist (Position, Blickrichtung, laufende Animation), und zwar mit einer
 * Verzögerung von `reactionFrames`. Eingaben der Spieler kennt sie nicht.
 * Gesteuert wird ausschließlich über dieselben Eingaben wie bei Menschen.
 */

export type AiState = 'abwarten' | 'annaehern' | 'abstandHalten' | 'angreifen' | 'abwehren' | 'ausweichen';

/** Sichtbarer Zustand eines Kämpfers zu einem Zeitpunkt. */
interface Snap {
  slot: number;
  x: number;
  air: number;
  facing: 1 | -1;
  state: FighterState;
  stateFrame: number;
  attack: AttackId | null;
  low: boolean;
  hurt: boolean;
}

const HISTORY = 64;

interface Threat {
  from: Snap;
  height: HitHeight;
  behind: boolean;
  /** Frames bis zum Ende der aktiven Phase (aus Sicht der verzögerten Wahrnehmung). */
  remaining: number;
  key: string;
}

export class AIController implements Controller {
  readonly human = false;
  state: AiState = 'abwarten';
  private stateFrames = 0;
  private decisionIn = 20;
  private targetSlot = -1;
  private guard: 'hoch' | 'tief' | null = null;
  private guardFrames = 0;
  private dodge: RelDir | null = null;
  private readonly history: Snap[][] = [];
  private tick = 0;
  private readonly reacted = new Set<string>();
  private lastAction = '';

  constructor(
    private readonly level: AiLevel,
    private readonly rng: Rng,
  ) {}

  debugState(): string {
    const t = this.targetSlot >= 0 ? `→${this.targetSlot}` : '';
    return `KI ${this.state.toUpperCase()} ${t} ${this.lastAction}`;
  }

  next(self: Fighter, all: readonly Fighter[]): FrameInput {
    this.tick++;
    this.record(all);
    const seen = this.perceive().filter((s) => s.slot !== self.slot);
    const inp = emptyInput();
    this.stateFrames++;

    if (!self.actionable) {
      // Während Angriffen, Sprüngen usw. keine neuen Befehle.
      if (self.state === 'blockstun' && this.guard) {
        inp.block = true;
        if (this.guard === 'tief') inp.y = 1;
      }
      return inp;
    }

    // 1. Reaktion auf sichtbare Angriffe
    const threat = this.detectThreat(self, seen);
    if (threat && !this.reacted.has(threat.key)) {
      this.reacted.add(threat.key);
      this.reactTo(threat);
    }
    if (this.reacted.size > 64) this.reacted.clear();

    if (this.guardFrames > 0) {
      this.guardFrames--;
      inp.block = true;
      if (this.guard === 'tief') inp.y = 1;
      if (this.guardFrames === 0) this.guard = null;
      return inp;
    }
    if (this.dodge) {
      this.setDir(inp, this.dodge, self.facing);
      this.lastAction = this.dodge === 'D' ? 'DUCKEN' : 'AUSWEICHEN';
      if (this.dodge !== 'D' || this.stateFrames > 20) {
        this.dodge = null;
        this.enter('abwarten', 12);
      }
      return inp;
    }

    // 2. Taktische Entscheidung in festen Abständen
    if (--this.decisionIn <= 0) this.decide(self, seen);

    // 3. Ausführung des Zustands
    const target = seen.find((s) => s.slot === this.targetSlot && !s.hurt);
    if (!target && this.state !== 'abwarten' && this.state !== 'ausweichen') this.enter('abwarten', 10);
    switch (this.state) {
      case 'abwarten':
        break;
      case 'annaehern':
        if (target) this.approach(self, target, inp);
        break;
      case 'abstandHalten':
        if (target) this.keepDistance(self, target, inp);
        break;
      case 'angreifen':
        if (target) this.attack(self, target, inp);
        break;
      case 'ausweichen':
        this.evade(self, inp);
        break;
      case 'abwehren':
        this.enter('abwarten', 6);
        break;
    }
    return inp;
  }

  private enter(s: AiState, decideIn?: number): void {
    this.state = s;
    this.stateFrames = 0;
    if (decideIn !== undefined) this.decisionIn = decideIn;
  }

  private record(all: readonly Fighter[]): void {
    const snaps: Snap[] = all.map((f) => ({
      slot: f.slot,
      x: f.x,
      air: f.air,
      facing: f.facing,
      state: f.state,
      stateFrame: f.stateFrame,
      attack: f.attack?.id ?? null,
      low: f.isLow,
      hurt: f.isHurt,
    }));
    this.history.push(snaps);
    if (this.history.length > HISTORY) this.history.shift();
  }

  /** Zustand der anderen Kämpfer vor reactionFrames Frames. */
  private perceive(): Snap[] {
    const idx = Math.max(0, this.history.length - 1 - this.level.reactionFrames);
    return this.history[idx];
  }

  private detectThreat(self: Fighter, seen: Snap[]): Threat | null {
    const ranges = attackRanges();
    let best: Threat | null = null;
    for (const o of seen) {
      if (o.state !== 'attack' || !o.attack) continue;
      const a = ATTACKS[o.attack];
      const end = a.startup + a.active;
      if (o.stateFrame >= end) continue;
      const dx = self.x - o.x;
      const dir = Math.sign(dx) as -1 | 0 | 1;
      const aimsAtMe = a.backward ? dir === -o.facing : dir === o.facing;
      if (!aimsAtMe) continue;
      const r = ranges[a.id];
      if (Math.abs(dx) > r.max + 10) continue;
      const behind = Math.sign(o.x - self.x) !== self.facing;
      const t: Threat = {
        from: o,
        height: a.height,
        behind,
        remaining: end - o.stateFrame,
        key: `${o.slot}:${this.tick - this.level.reactionFrames - o.stateFrame}`,
      };
      if (!best || t.remaining < best.remaining) best = t;
    }
    return best;
  }

  private reactTo(t: Threat): void {
    const lv = this.level;
    if (!this.rng.chance(lv.blockChance)) return;
    const wrong = this.rng.chance(lv.errorRate);
    this.lastAction = 'ABWEHR';
    this.enter('abwehren');
    if (t.behind) {
      // Von hinten kann nicht abgewehrt werden: nach vorn ausweichen.
      this.dodge = t.height === 'tief' ? 'U' : 'UF';
      return;
    }
    const hold = Math.max(8, t.remaining + 6 - this.level.reactionFrames / 2);
    switch (t.height) {
      case 'hoch':
        if (this.rng.chance(0.3)) {
          this.dodge = 'D';
        } else {
          this.guard = wrong ? 'tief' : 'hoch';
          this.guardFrames = hold;
        }
        break;
      case 'mittel':
        this.guard = wrong ? (this.rng.chance(0.5) ? null : 'hoch') : this.rng.chance(0.5) ? 'hoch' : 'tief';
        this.guardFrames = this.guard ? hold : 0;
        break;
      case 'tief':
        if (!wrong && this.rng.chance(0.35)) {
          this.dodge = 'U';
        } else {
          this.guard = wrong ? 'hoch' : 'tief';
          this.guardFrames = hold;
        }
        break;
    }
  }

  private decide(self: Fighter, seen: Snap[]): void {
    const lv = this.level;
    this.decisionIn = Math.max(4, Math.round(lv.decisionInterval * (0.6 + this.rng.next() * 0.8)));
    const targets = seen.filter((s) => !s.hurt);
    if (targets.length === 0) {
      this.enter('abwarten');
      return;
    }
    // Ziel: meist der nächste Gegner, manchmal der andere – Mensch und KI gleichermaßen.
    targets.sort((a, b) => Math.abs(a.x - self.x) - Math.abs(b.x - self.x));
    const keep = targets.find((t) => t.slot === this.targetSlot);
    let target = targets[0];
    if (keep && this.rng.chance(0.5)) target = keep;
    else if (targets.length > 1 && this.rng.chance(0.25)) target = targets[1];
    this.targetSlot = target.slot;

    const dist = Math.abs(target.x - self.x);
    if (this.rng.chance(lv.errorRate * 0.5)) {
      this.lastAction = 'ZÖGERN';
      this.enter('abwarten');
      return;
    }
    const r = this.rng.next();
    if (dist < 34 && r < 0.25) this.enter('ausweichen');
    else if (r < lv.aggression + 0.15) this.enter(this.bestAttack(self, target) ? 'angreifen' : 'annaehern');
    else if (dist > 110) this.enter(this.rng.chance(0.75) ? 'annaehern' : 'abwarten');
    else if (r < lv.aggression + 0.5) this.enter('abstandHalten');
    else this.enter('abwarten');
  }

  private setDir(inp: FrameInput, rel: RelDir, facing: 1 | -1): void {
    inp.x = 0;
    inp.y = 0;
    if (rel.includes('F')) inp.x = facing;
    if (rel.includes('B')) inp.x = (facing === 1 ? -1 : 1) as -1 | 1;
    if (rel.startsWith('U')) inp.y = -1;
    if (rel.startsWith('D')) inp.y = 1;
  }

  private press(inp: FrameInput, button: 'punch' | 'kick' | 'block', rel: RelDir, facing: 1 | -1): void {
    this.setDir(inp, rel, facing);
    inp[button] = true;
    if (button === 'punch') inp.punchPressed = true;
    if (button === 'kick') inp.kickPressed = true;
    if (button === 'block') inp.blockPressed = true;
  }

  private isBehind(self: Fighter, t: Snap): boolean {
    return Math.sign(t.x - self.x) !== self.facing;
  }

  /** Passender Angriff für Abstand und Lage des Ziels (oder null). */
  private bestAttack(self: Fighter, t: Snap): AttackId | null {
    const ranges = attackRanges();
    const dist = Math.abs(t.x - self.x);
    const behind = this.isBehind(self, t);
    const airborne = t.air > 4;
    const options = ATTACK_IDS.filter((id) => {
      const a = ATTACKS[id];
      if (a.backward !== behind) return false;
      if (airborne && a.height === 'tief') return false;
      const r = ranges[id];
      if (t.low) {
        if (r.lowMin === null || r.lowMax === null) return false;
        return dist >= r.lowMin - 2 && dist <= r.lowMax - 4;
      }
      return dist >= r.min - 2 && dist <= r.max - 4;
    });
    if (options.length === 0) return null;
    // Mit höherer Stufe werden schwierige Angriffe mit ganzem Punkt bevorzugt.
    const pick = this.rng.weighted(options, (id) => {
      const full = ATTACKS[id].recovery >= 18 ? 1 : 0;
      const flyPenalty = id === 'flugTritt' && dist < 60 ? 0.2 : 1;
      return (1 + full * this.level.aggression) * flyPenalty;
    });
    return pick ?? null;
  }

  private approach(self: Fighter, t: Snap, inp: FrameInput): void {
    const dist = Math.abs(t.x - self.x);
    if (this.isBehind(self, t)) {
      if (this.bestAttack(self, t)) {
        this.enter('angreifen');
        return;
      }
      this.press(inp, 'block', 'B', self.facing);
      this.lastAction = 'UMDREHEN';
      return;
    }
    if (this.bestAttack(self, t) && this.rng.chance(0.25 + this.level.aggression * 0.5)) {
      this.enter('angreifen');
      return;
    }
    if (dist > 40) {
      this.setDir(inp, 'F', self.facing);
      this.lastAction = 'VOR';
    }
  }

  private keepDistance(self: Fighter, t: Snap, inp: FrameInput): void {
    const dist = Math.abs(t.x - self.x);
    if (this.isBehind(self, t) && dist < 120 && this.rng.chance(0.08)) {
      this.press(inp, 'block', 'B', self.facing);
      this.lastAction = 'UMDREHEN';
      return;
    }
    const toward: RelDir = this.isBehind(self, t) ? 'B' : 'F';
    const away: RelDir = toward === 'F' ? 'B' : 'F';
    if (dist < 54) this.setDir(inp, away, self.facing);
    else if (dist > 84) this.setDir(inp, toward, self.facing);
    this.lastAction = 'ABSTAND';
  }

  private attack(self: Fighter, t: Snap, inp: FrameInput): void {
    let id = this.bestAttack(self, t);
    if (this.rng.chance(this.level.errorRate * 0.6)) {
      // Fehlgriff: ein zufälliger Angriff, der nicht passt.
      id = this.rng.pick(ATTACK_IDS.filter((a) => ATTACKS[a].backward === this.isBehind(self, t)));
    }
    if (!id) {
      this.enter('annaehern');
      return;
    }
    const [button, rel] = ATTACK_INPUT[id];
    this.press(inp, button, rel, self.facing);
    this.lastAction = id.toUpperCase();
    // Nach dem Angriff Abstand gewinnen oder nachsetzen.
    this.enter(this.rng.chance(0.5) ? 'abstandHalten' : 'abwarten', 20 + this.rng.int(20));
  }

  private evade(self: Fighter, inp: FrameInput): void {
    const nearWall = self.facing === 1 ? self.x < 110 : self.x > 550;
    this.setDir(inp, nearWall ? 'U' : 'UB', self.facing);
    this.lastAction = 'SALTO';
    this.enter('abwarten', 30);
  }
}

/** Eingabe (Taste und relative Richtung) je Angriff, abgeleitet aus der Steuerungstabelle. */
const ATTACK_INPUT = (() => {
  const out = {} as Record<AttackId, ['punch' | 'kick', RelDir]>;
  for (const button of ['punch', 'kick'] as const) {
    for (const [dir, action] of Object.entries(BUTTON_TABLE[button]) as [RelDir, string][]) {
      if (action in ATTACKS && !(action in out)) out[action as AttackId] = [button, dir];
    }
  }
  return out;
})();
