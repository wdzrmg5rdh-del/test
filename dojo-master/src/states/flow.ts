import type { Game } from '../core/game';
import { Session, type Mode, type Stage } from '../rules/session';
import { BonusState } from './bonusState';
import { FightState } from './fightState';
import type { GameState } from './state';

/** Übergänge zwischen den Spielzuständen. */
export class Flow {
  constructor(private readonly game: Game) {}

  /** Seed aus der Adresszeile (?seed=123) für reproduzierbare Partien, sonst zufällig. */
  private seed(): number {
    const m = /[?&]seed=(\d+)/.exec(location.search);
    if (m) return Number(m[1]) >>> 0;
    return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
  }

  newGame(mode: Mode, startStage: Stage = 'fight'): void {
    const session = new Session(mode, this.seed());
    this.toStage(session, startStage);
  }

  toStage(session: Session, stage: Stage): void {
    switch (stage) {
      case 'fight':
        this.game.setState(new FightState(this.game, session));
        break;
      case 'bonusA':
        this.game.setState(new BonusState(this.game, session, 'A'));
        break;
      case 'bonusB':
        this.game.setState(new BonusState(this.game, session, 'B'));
        break;
      case 'gameover':
        this.newGame(session.mode);
        break;
    }
  }

  pause(state: GameState): void {
    this.game.setState(state);
  }

  resume(state: GameState): void {
    this.game.setState(state);
  }
}
