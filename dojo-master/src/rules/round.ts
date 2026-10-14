import type { Controller } from '../ai/controller';
import { findCandidates, resolveExchange, separateFighters } from '../combat/collision';
import { CONFIG } from '../config';
import type { EventSink } from '../core/events';
import type { Rng } from '../core/rng';
import type { Fighter } from '../fighter/fighter';
import { fmt, TEXT } from '../texts';
import { Referee } from './referee';
import { rankFighters } from './scoring';

export type RoundPhase = 'intro' | 'fight' | 'hitstop' | 'afterHit' | 'resume' | 'ending' | 'finished';

export interface RoundResult {
  ranking: Fighter[];
  remainingFrames: number;
  /** Runde endete durch Erreichen der Siegpunktzahl (nicht durch Zeitablauf). */
  byPoints: boolean;
}

/**
 * Ablauf einer Kampfrunde mit drei Kämpfern: Begrüßung, Kampf, Unterbrechung
 * nach jedem Treffer mit Rückkehr auf die Ausgangspositionen, Rundenende durch
 * Siegpunktzahl oder Zeitablauf, Siegerehrung.
 */
export class FightRound {
  phase: RoundPhase = 'intro';
  phaseFrame = 0;
  timer = CONFIG.rules.roundSeconds * 60;
  readonly referee = new Referee();
  result: RoundResult | null = null;
  /** Zuletzt getroffener Kämpfer (für kurzes Aufblitzen in der Darstellung). */
  flash: { fighter: Fighter; frames: number } | null = null;
  private tick = 0;
  private byPoints = false;

  constructor(
    readonly fighters: Fighter[],
    readonly controllers: Controller[],
    readonly names: string[],
    private readonly rng: Rng,
    private readonly events: EventSink,
  ) {
    fighters.forEach((f) => {
      f.roundPoints = 0;
      f.lastScoreTick = -1;
      f.firstScoreTick = -1;
    });
    this.resetPositions();
    for (const f of fighters) f.ceremony('ready');
  }

  private resetPositions(): void {
    this.fighters.forEach((f, i) => f.reset(CONFIG.arena.startX[i], CONFIG.arena.startFacing[i]));
  }

  private setPhase(p: RoundPhase): void {
    this.phase = p;
    this.phaseFrame = 0;
  }

  get secondsLeft(): number {
    return Math.ceil(this.timer / 60);
  }

  update(): void {
    this.tick++;
    this.phaseFrame++;
    this.referee.update();
    if (this.flash && --this.flash.frames <= 0) this.flash = null;

    switch (this.phase) {
      case 'intro':
        this.updateFighters(false);
        if (this.phaseFrame === 30) {
          for (const f of this.fighters) f.reset(f.x, f.facing);
        }
        if (this.phaseFrame === 40) {
          this.referee.say(TEXT.referee.begin, 60);
          this.referee.signal('begin', 40);
          this.events.sound('rundenbeginn');
        }
        if (this.phaseFrame >= CONFIG.timing.roundIntroFrames) this.setPhase('fight');
        break;

      case 'fight':
        this.updateFighters(true);
        this.checkHits();
        if (this.phase === 'fight') {
          this.timer--;
          if (this.timer > 0 && this.timer <= 5 * 60 && this.timer % 60 === 0) this.events.sound('zeit');
          if (this.timer <= 0) {
            this.timer = 0;
            this.referee.say(TEXT.referee.timeUp, 80);
            this.referee.signal('stop', 80);
            this.events.sound('rundenende');
            this.setPhase('ending');
          }
        }
        break;

      case 'hitstop':
        if (this.phaseFrame >= CONFIG.timing.hitStopFrames) this.setPhase('afterHit');
        break;

      case 'afterHit':
        this.updateFighters(false);
        if (this.phaseFrame >= CONFIG.timing.afterHitFrames) {
          if (this.fighters.some((f) => f.roundPoints >= CONFIG.rules.winPoints * 2)) {
            this.byPoints = true;
            this.referee.say(TEXT.referee.stop, 60);
            this.referee.signal('stop', 60);
            this.events.sound('rundenende');
            this.setPhase('ending');
          } else {
            this.resetPositions();
            this.referee.say(TEXT.referee.resume, 40);
            this.referee.signal('begin', 30);
            this.setPhase('resume');
          }
        }
        break;

      case 'resume':
        this.updateFighters(false);
        if (this.phaseFrame >= CONFIG.timing.resumeFrames) this.setPhase('fight');
        break;

      case 'ending':
        this.updateFighters(false);
        if (this.phaseFrame === 70) this.announceWinner();
        if (this.phaseFrame >= CONFIG.timing.roundEndFrames) this.setPhase('finished');
        break;

      case 'finished':
        this.updateFighters(false);
        break;
    }
  }

  private updateFighters(withControl: boolean): void {
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      const input = withControl ? this.controllers[i].next(f, this.fighters) : null;
      f.update(input);
      if (f.state === 'knockdown' && f.stateFrame === 12) this.events.sound('aufprall');
    }
    separateFighters(this.fighters);
  }

  private checkHits(): void {
    const res = resolveExchange(findCandidates(this.fighters));
    for (const b of res.blocked) {
      b.attacker.onAttackBlocked(b.defender.x);
      b.defender.onBlocked(b.attacker.x);
      this.events.sound('abwehr');
    }
    if (res.clash) {
      const [a, b] = res.clash;
      a.onAttackBlocked(b.x);
      b.onAttackBlocked(a.x);
      this.events.sound('abwehr');
      this.referee.say(TEXT.referee.clash, 70);
      this.referee.signal('clash', 50);
    }
    if (res.hit) {
      const { attacker, defender, points } = res.hit;
      attacker.onHitLanded();
      defender.onHurt(points, attacker.x);
      attacker.roundPoints += points;
      attacker.lastScoreTick = this.tick;
      if (attacker.firstScoreTick < 0) attacker.firstScoreTick = this.tick;
      this.flash = { fighter: defender, frames: 6 };
      this.events.sound(points >= 2 ? 'trefferSchwer' : 'trefferLeicht');
      this.events.sound('punkt');
      const name = this.names[attacker.slot];
      this.referee.say(fmt(points >= 2 ? TEXT.referee.fullPoint : TEXT.referee.halfPoint, { name }), 110);
      this.referee.signal(points >= 2 ? 'full' : 'half', 110, attacker.x, attacker.gi);
      this.setPhase('hitstop');
    }
  }

  private announceWinner(): void {
    const ranking = rankFighters(this.fighters, CONFIG.rules.tieRule, this.rng);
    this.result = { ranking, remainingFrames: this.timer, byPoints: this.byPoints };
    const winner = ranking[0];
    const tied = ranking[1].roundPoints === winner.roundPoints;
    this.referee.say(
      tied
        ? fmt(TEXT.referee.tieDraw, { name: this.names[winner.slot] })
        : fmt(TEXT.referee.winner, { name: this.names[winner.slot] }),
      CONFIG.timing.roundEndFrames,
    );
    this.referee.signal('winner', CONFIG.timing.roundEndFrames, winner.x, winner.gi);
    for (const f of this.fighters) {
      if (f.isDown) continue;
      if (f === winner) f.ceremony('victory');
      else if (f === ranking[ranking.length - 1]) f.ceremony('defeat');
      else f.ceremony('bow');
    }
  }

  get isFinished(): boolean {
    return this.phase === 'finished';
  }
}
