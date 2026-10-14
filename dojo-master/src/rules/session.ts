import type { Controller } from '../ai/controller';
import { CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { Rng } from '../core/rng';
import { Fighter, type GiColor } from '../fighter/fighter';
import { fmt, TEXT } from '../texts';
import { FightRound, type RoundResult } from './round';
import { beltForScore, scoreForRoundPoints, timeBonus } from './scoring';

export type Mode = 1 | 2;

export const SLOT_GI: GiColor[] = ['weiss', 'rot', 'blau'];

/** Ein menschlicher Spieler über das ganze Spiel. */
export interface PlayerProfile {
  player: 0 | 1;
  slot: number;
  score: number;
  beltIndex: number;
  eliminated: boolean;
  /** Bis zum Ausscheiden bestrittene Kampfrunden. */
  rounds: number;
}

export interface RoundSummaryLine {
  slot: number;
  name: string;
  human: boolean;
  place: number;
  roundPoints: number;
  added: number;
  timeBonus: number;
  total: number | null;
  eliminated: boolean;
}

export interface RoundSummary {
  lines: RoundSummaryLine[];
  messages: string[];
  beltUp: boolean;
  gameOver: boolean;
}

export type Stage = 'fight' | 'bonusA' | 'bonusB' | 'gameover';

/**
 * Spielverlauf über mehrere Runden: Zuordnung der Kämpfer zu Spielern und KI,
 * Punktestand, Gürtel, Ausscheiden und Wechsel zwischen Kampf- und Bonusrunden.
 */
export class Session {
  readonly rng: Rng;
  readonly players: PlayerProfile[];
  round = 0;
  private fightsSinceBonus = 0;
  private bonusCount = 0;

  constructor(
    readonly mode: Mode,
    readonly seed: number,
  ) {
    this.rng = new Rng(seed);
    this.players = [{ player: 0, slot: 0, score: 0, beltIndex: 0, eliminated: false, rounds: 0 }];
    if (mode === 2) this.players.push({ player: 1, slot: 1, score: 0, beltIndex: 0, eliminated: false, rounds: 0 });
  }

  get activePlayers(): PlayerProfile[] {
    return this.players.filter((p) => !p.eliminated);
  }

  /** KI-Stufe = höchste Gürtelstufe der noch aktiven Spieler. */
  get aiLevel(): number {
    const act = this.activePlayers;
    if (act.length === 0) return 0;
    return Math.min(CONFIG.ai.length - 1, Math.max(...act.map((p) => p.beltIndex)));
  }

  playerInSlot(slot: number): PlayerProfile | undefined {
    return this.activePlayers.find((p) => p.slot === slot);
  }

  slotName(slot: number): string {
    return TEXT.fighters[SLOT_GI[slot]];
  }

  hudLabel(slot: number): string {
    const p = this.playerInSlot(slot);
    if (!p) return TEXT.fighters[SLOT_GI[slot]];
    return p.player === 0 ? TEXT.players.p1 : TEXT.players.p2;
  }

  /** Erzeugt eine neue Kampfrunde. makeController liefert Mensch- oder KI-Steuerung je Platz. */
  createRound(events: EventSink, makeController: (slot: number, player: PlayerProfile | undefined, rng: Rng) => Controller): FightRound {
    this.round++;
    const fighters: Fighter[] = [];
    const controllers: Controller[] = [];
    for (let slot = 0; slot < 3; slot++) {
      const f = new Fighter(slot, SLOT_GI[slot], CONFIG.arena.startX[slot], CONFIG.arena.startFacing[slot], events);
      const p = this.playerInSlot(slot);
      f.beltIndex = p ? p.beltIndex : this.aiLevel;
      if (!p) f.walkSpeedFactor = CONFIG.ai[this.aiLevel].walkSpeedFactor;
      fighters.push(f);
      controllers.push(makeController(slot, p, this.rng.fork()));
    }
    const names = [0, 1, 2].map((s) => this.slotName(s));
    return new FightRound(fighters, controllers, names, this.rng.fork(), events);
  }

  /** Wertet eine beendete Kampfrunde aus. */
  applyRoundResult(res: RoundResult): RoundSummary {
    const lines: RoundSummaryLine[] = [];
    const messages: string[] = [];
    let beltUp = false;
    const last = res.ranking[res.ranking.length - 1];
    res.ranking.forEach((f, idx) => {
      const p = this.playerInSlot(f.slot);
      const added = scoreForRoundPoints(f.roundPoints);
      const bonus = idx === 0 && res.byPoints ? timeBonus(res.remainingFrames) : 0;
      let eliminated = false;
      if (p) {
        p.rounds++;
        p.score += added + bonus;
        const nb = beltForScore(p.score);
        if (nb > p.beltIndex) {
          p.beltIndex = nb;
          beltUp = true;
          messages.push(fmt(TEXT.referee.beltUp, { name: this.hudLabel(f.slot), belt: TEXT.belts[CONFIG.belts[nb].id] }));
        }
        if (f === last) eliminated = true;
      }
      lines.push({
        slot: f.slot,
        name: this.hudLabel(f.slot),
        human: !!p,
        place: idx + 1,
        roundPoints: f.roundPoints,
        added,
        timeBonus: p ? bonus : 0,
        total: p ? p.score : null,
        eliminated,
      });
    });
    for (const l of lines) {
      if (!l.eliminated) continue;
      const p = this.playerInSlot(l.slot)!;
      messages.push(fmt(TEXT.referee.eliminated, { name: l.name }));
      p.eliminated = true;
    }
    this.fightsSinceBonus++;
    return { lines, messages, beltUp, gameOver: this.activePlayers.length === 0 };
  }

  /** Bonuspunkte gutschreiben (Gürtelaufstieg möglich). */
  addBonus(player: 0 | 1, points: number): string | null {
    const p = this.players.find((q) => q.player === player);
    if (!p || p.eliminated) return null;
    p.score = Math.max(0, p.score + points);
    const nb = beltForScore(p.score);
    if (nb > p.beltIndex) {
      p.beltIndex = nb;
      return fmt(TEXT.referee.beltUp, { name: this.hudLabel(p.slot), belt: TEXT.belts[CONFIG.belts[nb].id] });
    }
    return null;
  }

  /** Was als Nächstes kommt. */
  nextStage(): Stage {
    if (this.activePlayers.length === 0) return 'gameover';
    if (this.fightsSinceBonus >= CONFIG.rules.fightRoundsPerBonus) {
      this.fightsSinceBonus = 0;
      const kind = this.bonusCount % 2 === 0 ? 'bonusA' : 'bonusB';
      this.bonusCount++;
      return kind;
    }
    return 'fight';
  }
}
