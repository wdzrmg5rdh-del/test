import { CONFIG } from '../config';
import type { EventSink } from '../core/events';
import type { Rng } from '../core/rng';
import { Fighter, type GiColor } from '../fighter/fighter';
import type { FrameInput } from '../input/types';

/**
 * Bonusrunde: Der Spieler hält einen Schild und wehrt Bälle ab, die von beiden
 * Seiten in drei Höhen auf ihn zuspringen. In Variante B kommen zusätzlich
 * Bomben, denen man durch Ducken (hohe Bombe) oder Springen (tiefe Bombe)
 * ausweichen muss.
 */

export type ShieldLevel = 'hoch' | 'mittel' | 'tief';
export type BonusKind = 'A' | 'B';

/** Höhe der Ballmitte über dem Boden je Stufe. */
const LEVEL_HEIGHT: Record<ShieldLevel, number> = { hoch: 89, mittel: 68, tief: 39 };
/** Scheitelhöhe der Sprungbögen je Stufe. */
const ARC_PEAK: Record<ShieldLevel, number> = { hoch: 100, mittel: 82, tief: 58 };
/** Abstand der Schildebene von der Körpermitte je Stufe (aus den Schildposen). */
const SHIELD_X: Record<ShieldLevel, number> = { hoch: 26, mittel: 35, tief: 41 };
/** Tiefe Bomben rollen knapp über dem Boden. */
const LOW_BOMB_HEIGHT = 10;
const BALL_R = 5;
const JUMP_FRAMES = 32;
const JUMP_HEIGHT = 44;

export interface BonusObject {
  kind: 'ball' | 'bomb';
  /** Bewegungsrichtung: 1 = nach rechts (kommt von links), -1 = nach links. */
  dir: 1 | -1;
  level: ShieldLevel;
  x: number;
  /** Höhe über dem Boden. */
  h: number;
  speed: number;
  /** Phase des Sprungbogens, so gewählt, dass der Ball beim Zielspieler die Stufenhöhe hat. */
  phase: number;
  peak: number;
  state: 'fly' | 'deflected' | 'dropped' | 'exploding' | 'gone';
  vx: number;
  vh: number;
  frame: number;
}

export interface BonusPlayer {
  player: 0 | 1;
  gi: GiColor;
  beltIndex: number;
  fighter: Fighter;
  shield: ShieldLevel;
  jump: number;
  stun: number;
  deflected: number;
  hits: number;
  bombs: number;
  points: number;
  popups: { x: number; y: number; text: string; frames: number }[];
}

export class BonusRound {
  phase: 'intro' | 'play' | 'outro' | 'finished' = 'intro';
  phaseFrame = 0;
  readonly objects: BonusObject[] = [];
  readonly players: BonusPlayer[];
  spawned = 0;
  private spawnIn = 0;

  constructor(
    readonly kind: BonusKind,
    players: { player: 0 | 1; gi: GiColor; beltIndex: number }[],
    private readonly rng: Rng,
    private readonly events: EventSink,
  ) {
    const xs = players.length === 1 ? CONFIG.bonus.playerX1 : CONFIG.bonus.playerX2;
    this.players = players.map((p, i) => {
      const facing: 1 | -1 = players.length === 1 ? 1 : i === 0 ? -1 : 1;
      const f = new Fighter(i, p.gi, xs[i], facing, events);
      f.beltIndex = p.beltIndex;
      f.ceremony('shieldMid');
      return {
        ...p,
        fighter: f,
        shield: 'mittel' as ShieldLevel,
        jump: -1,
        stun: 0,
        deflected: 0,
        hits: 0,
        bombs: 0,
        points: 0,
        popups: [],
      };
    });
  }

  get remaining(): number {
    return CONFIG.bonus.objectCount - this.spawned;
  }

  update(inputs: (FrameInput | null)[]): void {
    this.phaseFrame++;
    for (let i = 0; i < this.players.length; i++) this.updatePlayer(this.players[i], this.phase === 'play' ? inputs[i] : null);
    if (this.phase === 'intro' && this.phaseFrame >= CONFIG.bonus.introFrames) {
      this.phase = 'play';
      this.phaseFrame = 0;
      this.events.sound('rundenbeginn');
    }
    if (this.phase === 'play') {
      if (this.spawned < CONFIG.bonus.objectCount && --this.spawnIn <= 0) this.spawn();
      this.updateObjects();
      if (this.spawned >= CONFIG.bonus.objectCount && this.objects.every((o) => o.state === 'gone')) {
        this.phase = 'outro';
        this.phaseFrame = 0;
        this.events.sound('rundenende');
        for (const p of this.players) p.fighter.ceremony('victory');
      }
    } else {
      this.updateObjects();
    }
    if (this.phase === 'outro' && this.phaseFrame >= CONFIG.bonus.outroFrames) this.phase = 'finished';
  }

  private updatePlayer(p: BonusPlayer, inp: FrameInput | null): void {
    const f = p.fighter;
    for (const pp of p.popups) pp.frames--;
    p.popups = p.popups.filter((pp) => pp.frames > 0);
    if (p.stun > 0) {
      p.stun--;
      if (p.stun === 0) f.ceremony(this.shieldAnim(p.shield));
    } else if (inp) {
      if (inp.x !== 0 && inp.x !== f.facing) f.facing = inp.x;
      const lvl: ShieldLevel = inp.y < 0 ? 'hoch' : inp.y > 0 ? 'tief' : 'mittel';
      if (p.jump < 0 && (inp.punchPressed || inp.kickPressed || inp.blockPressed)) {
        p.jump = 0;
        f.ceremony('shieldJump');
        this.events.sound('sprung');
      }
      if (p.jump < 0 && lvl !== p.shield) {
        p.shield = lvl;
        f.ceremony(this.shieldAnim(lvl));
      } else if (p.jump >= 0) {
        p.shield = 'mittel';
      }
    }
    if (p.jump >= 0) {
      p.jump++;
      const jf = p.jump - 4;
      if (jf >= 0 && jf < JUMP_FRAMES) {
        const t = (jf + 1) / JUMP_FRAMES;
        f.air = 4 * JUMP_HEIGHT * t * (1 - t);
      } else {
        f.air = 0;
      }
      if (jf === JUMP_FRAMES) this.events.sound('landung');
      if (p.jump >= JUMP_FRAMES + 10) {
        p.jump = -1;
        f.ceremony(this.shieldAnim(p.shield));
      }
    }
    f.update(null);
  }

  private shieldAnim(l: ShieldLevel): 'shieldHigh' | 'shieldMid' | 'shieldLow' {
    return l === 'hoch' ? 'shieldHigh' : l === 'tief' ? 'shieldLow' : 'shieldMid';
  }

  private spawn(): void {
    const cfg = CONFIG.bonus;
    const t = this.spawned / Math.max(1, cfg.objectCount - 1);
    const bomb = this.kind === 'B' && this.spawned > 1 && this.rng.chance(cfg.bombChance);
    const dir: 1 | -1 = this.rng.chance(0.5) ? 1 : -1;
    const levels: ShieldLevel[] = bomb ? ['hoch', 'tief'] : ['hoch', 'mittel', 'tief'];
    const level = this.rng.pick(levels);
    const speed = cfg.ballSpeedStart + (cfg.ballSpeedEnd - cfg.ballSpeedStart) * t;
    const startX = dir === 1 ? -12 : CONFIG.screen.width + 12;
    // Erster Spieler auf dem Weg des Balls bestimmt den Bogen.
    const targets = this.players.map((p) => p.fighter.x).sort((a, b) => (dir === 1 ? a - b : b - a));
    const targetX = targets[0];
    const lowBomb = bomb && level === 'tief';
    const peak = lowBomb ? LOW_BOMB_HEIGHT : ARC_PEAK[level];
    const want = lowBomb ? LOW_BOMB_HEIGHT : LEVEL_HEIGHT[level];
    const u0 = 0.5 + Math.sqrt(Math.max(0, 1 - want / peak)) / 2;
    const L = cfg.bounceLength;
    // Der Bogen ist so gelegt, dass der Ball an der Schildebene (Bomben: am Körper) die Stufenhöhe hat.
    const dist = Math.abs(targetX - startX) - (bomb ? 10 : SHIELD_X[level]);
    const o: BonusObject = {
      kind: bomb ? 'bomb' : 'ball',
      dir,
      level,
      x: startX,
      h: 0,
      speed,
      phase: u0 - dist / L,
      peak,
      state: 'fly',
      vx: 0,
      vh: 0,
      frame: 0,
    };
    o.h = this.arcHeight(o);
    this.objects.push(o);
    this.spawned++;
    this.spawnIn = Math.round(cfg.spawnIntervalStart + (cfg.spawnIntervalEnd - cfg.spawnIntervalStart) * t);
  }

  private arcHeight(o: BonusObject): number {
    let u = o.phase % 1;
    if (u < 0) u += 1;
    if (o.kind === 'bomb' && o.level === 'tief') return LOW_BOMB_HEIGHT;
    return 4 * o.peak * u * (1 - u);
  }

  private updateObjects(): void {
    for (const o of this.objects) {
      o.frame++;
      switch (o.state) {
        case 'fly': {
          const prevX = o.x;
          o.x += o.dir * o.speed;
          o.phase += o.speed / CONFIG.bonus.bounceLength;
          o.h = this.arcHeight(o);
          for (const p of this.players) {
            if (o.state !== 'fly') break;
            this.collide(o, p, prevX);
          }
          if (o.x < -30 || o.x > CONFIG.screen.width + 30) o.state = 'gone';
          break;
        }
        case 'deflected':
        case 'dropped':
          o.x += o.vx;
          o.h += o.vh;
          o.vh -= 0.25;
          if (o.h < 0 && o.state === 'dropped') {
            o.h = 0;
            o.vh = Math.abs(o.vh) * 0.5;
            if (o.vh < 0.6) o.vh = 0;
            o.vx *= 0.92;
          }
          if (o.x < -30 || o.x > CONFIG.screen.width + 30 || o.h < -40 || (o.state === 'dropped' && o.frame > 160))
            o.state = 'gone';
          break;
        case 'exploding':
          if (o.frame > 30) o.state = 'gone';
          break;
        case 'gone':
          break;
      }
    }
  }

  /** Körperausdehnung (unten, oben) über dem Boden. */
  private bodyExtent(p: BonusPlayer): [number, number] {
    const f = p.fighter;
    let lo = Infinity, hi = -Infinity;
    for (const pt of [f.skel.head, f.skel.hip, f.skel.neck, f.skel.kneeN, f.skel.ankleN, f.skel.kneeF, f.skel.ankleF]) {
      const h = CONFIG.arena.groundY - pt.y;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    return [lo - 3, hi + 7];
  }

  private collide(o: BonusObject, p: BonusPlayer, prevX: number): void {
    const f = p.fighter;
    const comingFromFront = Math.sign(prevX - f.x) === f.facing;
    // Schild: senkrechte Ebene vor dem Spieler in Höhe der Hand
    if (comingFromFront && p.stun === 0) {
      const sx = f.skel.handN.x + f.facing * 3;
      const crossed = (prevX - sx) * (o.x - sx) <= 0 || Math.abs(o.x - sx) < BALL_R;
      const sh = CONFIG.arena.groundY - f.skel.handN.y;
      if (crossed && Math.abs(o.h - sh) <= 13) {
        if (o.kind === 'ball') {
          o.state = 'deflected';
          o.frame = 0;
          o.vx = -o.dir * (1.5 + o.speed * 0.6);
          o.vh = 3.2;
          p.deflected++;
          p.points += CONFIG.bonus.pointsPerBall;
          p.popups.push({ x: o.x, y: CONFIG.arena.groundY - o.h - 10, text: `+${CONFIG.bonus.pointsPerBall}`, frames: 45 });
          this.events.sound('ballAbgewehrt');
        } else {
          this.explode(o, p);
        }
        return;
      }
    }
    // Körper
    if (Math.abs(o.x - f.x) < 9 + BALL_R) {
      const [lo, hi] = this.bodyExtent(p);
      if (o.h + BALL_R >= lo && o.h - BALL_R <= hi) {
        if (o.kind === 'bomb') {
          this.explode(o, p);
          return;
        }
        o.state = 'dropped';
        o.frame = 0;
        o.vx = -o.dir * 0.8;
        o.vh = 1.5;
        p.hits++;
        p.stun = CONFIG.bonus.stunFrames;
        p.jump = -1;
        f.air = 0;
        f.ceremony('shieldHit');
        this.events.sound('ballVerfehlt');
      }
    }
  }

  private explode(o: BonusObject, p: BonusPlayer): void {
    o.state = 'exploding';
    o.frame = 0;
    p.bombs++;
    p.points -= CONFIG.bonus.bombPenalty;
    p.stun = CONFIG.bonus.bombStunFrames;
    p.jump = -1;
    p.fighter.air = 0;
    p.fighter.ceremony('shieldHit');
    p.popups.push({ x: o.x, y: CONFIG.arena.groundY - o.h - 12, text: `-${CONFIG.bonus.bombPenalty}`, frames: 50 });
    this.events.sound('bombe');
  }

  get isFinished(): boolean {
    return this.phase === 'finished';
  }
}
