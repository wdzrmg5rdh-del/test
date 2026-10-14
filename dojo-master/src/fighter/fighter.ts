import { CONFIG } from '../config';
import type { EventSink } from '../core/events';
import { ANIMS, animLength, type AnimDef, type AnimId } from '../data/animations';
import { BUTTON_TABLE, MOVE_TABLE } from '../data/controls';
import { ATTACKS, MOVEMENT, type AirArc, type AttackDef, type HitHeight } from '../data/moves';
import { POSES } from '../data/poses';
import { toRelDir, type ActionButton, type FrameInput, type RelDir } from '../input/types';
import { computeSkeleton, copyPose, emptySkeleton, lerpPose, type Pose, type Skeleton } from './skeleton';

export type FighterState =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'block'
  | 'attack'
  | 'air'
  | 'turn'
  | 'blockstun'
  | 'stagger'
  | 'knockdown'
  | 'ceremony';

export type GiColor = 'weiss' | 'rot' | 'blau';

export type AttackPhase = 'startup' | 'active' | 'recovery' | null;

interface BufferedPress {
  button: ActionButton;
  dir: RelDir;
  age: number;
}

/**
 * Ein Kämpfer: Zustandsautomat für Bewegung, Angriffe, Abwehr und Reaktionen.
 * Die Steuerung erfolgt ausschließlich über FrameInput (Mensch oder KI).
 */
export class Fighter {
  x: number;
  /** Höhe über dem Boden (Sprünge), 0 = am Boden. */
  air = 0;
  facing: 1 | -1;
  state: FighterState = 'idle';
  stateFrame = 0;
  anim: AnimId = 'idle';
  animFrame = 0;
  attack: AttackDef | null = null;
  /** Der aktuelle Angriff hat bereits getroffen oder wurde abgewehrt. */
  attackResolved = false;
  /** Frame (Rundenzeit), in dem die aktive Phase des laufenden Angriffs begann. */
  activeSince = -1;
  blockKind: 'hoch' | 'tief' = 'hoch';
  arc: AirArc | null = null;
  walkDir: 1 | -1 = 1;
  walkSpeedFactor = 1;
  beltIndex = 0;
  /** Bewegung nach einem Treffer oder einer Abwehr (Pixel pro Frame, absolut). */
  private push = 0;
  private reactionLength = 0;

  readonly pose: Pose = copyPose(POSES.stance, {} as Pose);
  private readonly fromPose: Pose = copyPose(POSES.stance, {} as Pose);
  readonly skel: Skeleton = emptySkeleton();
  private readonly buffer: BufferedPress[] = [];

  // Rundenwertung
  roundPoints = 0;
  lastScoreTick = -1;
  firstScoreTick = -1;
  /** Fortlaufender Zähler der Logikschritte (für Prioritätsregel und Debug). */
  tick = 0;

  constructor(
    readonly slot: number,
    readonly gi: GiColor,
    x: number,
    facing: 1 | -1,
    private readonly events: EventSink,
  ) {
    this.x = x;
    this.facing = facing;
    this.updatePose();
  }

  get grounded(): boolean {
    return this.air <= 0.01 && this.arc === null;
  }

  get attackPhase(): AttackPhase {
    if (this.state !== 'attack' || !this.attack) return null;
    const a = this.attack;
    if (this.stateFrame < a.startup) return 'startup';
    if (this.stateFrame < a.startup + a.active) return 'active';
    return 'recovery';
  }

  /** Kann der Kämpfer gerade neue Befehle annehmen? */
  get actionable(): boolean {
    return this.state === 'idle' || this.state === 'walk' || this.state === 'crouch' || this.state === 'block';
  }

  /** Geduckte Haltung: hohe Angriffe gehen darüber hinweg. */
  get isLow(): boolean {
    if (this.state === 'crouch') return true;
    if (this.state === 'attack' && this.attack) return this.attack.id === 'fussfeger' || this.attack.id === 'fauststossTief';
    return false;
  }

  get isDown(): boolean {
    return this.state === 'knockdown';
  }

  get isHurt(): boolean {
    return this.state === 'stagger' || this.state === 'knockdown';
  }

  /** Setzt den Kämpfer auf eine Ausgangsposition zurück. */
  reset(x: number, facing: 1 | -1): void {
    this.x = x;
    this.facing = facing;
    this.air = 0;
    this.arc = null;
    this.attack = null;
    this.attackResolved = false;
    this.push = 0;
    this.buffer.length = 0;
    this.state = 'idle';
    this.stateFrame = 0;
    this.setAnim('idle');
    copyPose(POSES.stance, this.pose);
    copyPose(POSES.stance, this.fromPose);
    this.updatePose();
  }

  setAnim(id: AnimId): void {
    copyPose(this.pose, this.fromPose);
    this.anim = id;
    this.animFrame = 0;
  }

  private enter(state: FighterState, anim?: AnimId): void {
    this.state = state;
    this.stateFrame = 0;
    if (anim && anim !== this.anim) this.setAnim(anim);
    else if (anim) this.animFrame = 0;
  }

  /** Zeremonielle Posen (Sieg, Verbeugung, Niederlage) außerhalb des Kampfes. */
  ceremony(anim: AnimId): void {
    this.attack = null;
    this.arc = null;
    this.air = 0;
    this.push = 0;
    this.enter('ceremony', anim);
    this.setAnim(anim);
  }

  /**
   * Ein Logikschritt. input = null bedeutet: keine Steuerung (Kampfrichter unterbricht).
   */
  update(input: FrameInput | null): void {
    this.tick++;
    this.stateFrame++;
    this.animFrame++;
    this.recordPresses(input);

    switch (this.state) {
      case 'idle':
      case 'walk':
      case 'crouch':
      case 'block':
        this.control(input);
        break;
      case 'attack':
        this.updateAttack();
        break;
      case 'air':
        this.updateArc();
        if (this.stateFrame >= animLength(this.anim)) this.toIdle();
        break;
      case 'turn':
        if (this.stateFrame === MOVEMENT.turnFlipFrame) this.facing = this.facing === 1 ? -1 : 1;
        if (this.stateFrame >= animLength('turn')) this.toIdle();
        break;
      case 'blockstun':
        this.x += this.push;
        this.push *= 0.85;
        if (this.stateFrame >= this.reactionLength) this.toIdle();
        break;
      case 'stagger':
        this.x += this.push;
        this.push *= 0.9;
        this.fallToGround();
        if (this.stateFrame >= this.reactionLength) this.toIdle();
        break;
      case 'knockdown':
        if (this.stateFrame < 14) this.x += this.push;
        this.fallToGround();
        break;
      case 'ceremony':
        break;
    }
    this.updatePose();
  }

  private fallToGround(): void {
    if (this.air > 0) this.air = Math.max(0, this.air - 3);
  }

  private recordPresses(input: FrameInput | null): void {
    for (const b of this.buffer) b.age++;
    while (this.buffer.length && this.buffer[0].age > CONFIG.input.bufferFrames) this.buffer.shift();
    if (!input) {
      this.buffer.length = 0;
      return;
    }
    const dir = toRelDir(input.x, input.y, this.facing);
    if (input.punchPressed) this.buffer.push({ button: 'punch', dir, age: 0 });
    if (input.kickPressed) this.buffer.push({ button: 'kick', dir, age: 0 });
    if (input.blockPressed) this.buffer.push({ button: 'block', dir, age: 0 });
  }

  private takePress(): BufferedPress | undefined {
    const p = this.buffer.pop();
    this.buffer.length = 0;
    return p;
  }

  private toIdle(): void {
    this.attack = null;
    this.arc = null;
    this.air = 0;
    this.push = 0;
    this.enter('idle', 'idle');
  }

  private control(input: FrameInput | null): void {
    if (!input) {
      if (this.state !== 'idle') this.enter('idle', 'idle');
      return;
    }
    const rel = toRelDir(input.x, input.y, this.facing);
    const press = this.takePress();
    if (press) {
      const act = BUTTON_TABLE[press.button][press.dir];
      if (act === 'umdrehen') {
        this.enter('turn', 'turn');
        return;
      }
      if (act !== 'abwehrHoch' && act !== 'abwehrTief') {
        this.startAttack(ATTACKS[act]);
        return;
      }
    }
    if (input.block) {
      const kind: 'hoch' | 'tief' = rel === 'D' || rel === 'DF' || rel === 'DB' ? 'tief' : 'hoch';
      if (this.state !== 'block' || this.blockKind !== kind) {
        this.blockKind = kind;
        this.enter('block', kind === 'hoch' ? 'blockHigh' : 'blockLow');
      }
      return;
    }
    switch (MOVE_TABLE[rel]) {
      case 'stehen':
        if (this.state !== 'idle') this.enter('idle', 'idle');
        break;
      case 'schrittVor':
        this.walk(1);
        break;
      case 'schrittZurueck':
        this.walk(-1);
        break;
      case 'ducken':
        if (this.state !== 'crouch') this.enter('crouch', 'crouch');
        break;
      case 'sprung':
        this.startArc(MOVEMENT.jump, 'jump');
        break;
      case 'saltoVor':
        this.startArc(MOVEMENT.saltoVor, 'saltoVor');
        break;
      case 'saltoRueck':
        this.startArc(MOVEMENT.saltoRueck, 'saltoRueck');
        break;
    }
  }

  private walk(dir: 1 | -1): void {
    if (this.state !== 'walk' || this.walkDir !== dir) {
      this.walkDir = dir;
      this.enter('walk', dir === 1 ? 'walkF' : 'walkB');
    }
    const speed = dir === 1 ? MOVEMENT.walkForward : MOVEMENT.walkBack;
    this.x += this.facing * dir * speed * this.walkSpeedFactor;
    if (this.stateFrame % 16 === 8) this.events.sound('schritt');
  }

  private startArc(arc: AirArc, anim: AnimId): void {
    this.arc = arc;
    this.enter('air', anim);
    this.events.sound('sprung');
  }

  private updateArc(): void {
    const arc = this.arc;
    if (!arc) return;
    const f = this.stateFrame - arc.start;
    if (f >= 0 && f < arc.frames) {
      const t = (f + 1) / arc.frames;
      this.air = 4 * arc.height * t * (1 - t);
      this.x += (this.facing * arc.dist) / arc.frames;
      if (f + 1 === arc.frames) {
        this.air = 0;
        this.events.sound('landung');
      }
    }
  }

  startAttack(def: AttackDef): void {
    this.attack = def;
    this.attackResolved = false;
    this.activeSince = -1;
    this.arc = def.air ?? null;
    this.enter('attack', def.anim);
    this.setAnim(def.anim);
    if (def.air) this.events.sound('sprung');
  }

  private updateAttack(): void {
    const a = this.attack!;
    const f = this.stateFrame;
    if (f < a.startup && a.lunge !== 0) this.x += (this.facing * a.lunge) / a.startup;
    if (f === a.startup) {
      this.activeSince = this.tick;
      if (!this.attackResolved) this.events.sound(a.swing === 'punch' ? 'schlagLuft' : 'trittLuft');
    }
    this.updateArc();
    if (f >= a.startup + a.active + a.recovery) this.toIdle();
  }

  /** Der laufende Angriff hat getroffen. */
  onHitLanded(): void {
    this.attackResolved = true;
  }

  /** Der laufende Angriff wurde abgewehrt: sofort in die Erholung (Luftangriffe fliegen weiter). */
  onAttackBlocked(fromX: number): void {
    this.attackResolved = true;
    const a = this.attack;
    if (!a) return;
    if (!a.air) {
      const target = a.startup + a.active;
      if (this.stateFrame < target) {
        this.stateFrame = target;
        // Animation auf denselben Stand bringen
        this.animFrame = target;
      }
      this.x += Math.sign(this.x - fromX || -this.facing) * 3;
    }
  }

  /** Wurde durch Abwehr gestoppt: kurze Abwehrstarre mit Rückstoß. */
  onBlocked(fromX: number): void {
    this.push = Math.sign(this.x - fromX || -this.facing) * MOVEMENT.blockPushback * 3;
    this.reactionLength = CONFIG.timing.blockStunFrames;
    this.enter('blockstun', this.blockKind === 'hoch' ? 'blockStun' : 'blockStunLow');
    this.setAnim(this.blockKind === 'hoch' ? 'blockStun' : 'blockStunLow');
    this.buffer.length = 0;
  }

  /** Wurde getroffen: halber Punkt → Taumeln, ganzer Punkt → Sturz. */
  onHurt(points: number, fromX: number): void {
    this.attack = null;
    this.arc = null;
    this.buffer.length = 0;
    const dir = Math.sign(this.x - fromX) || -this.facing;
    if (points >= 2) {
      this.push = dir * MOVEMENT.knockdownPushback;
      this.enter('knockdown', 'knockdown');
      this.setAnim('knockdown');
    } else {
      this.push = dir * MOVEMENT.staggerPushback * 2;
      this.reactionLength = CONFIG.timing.staggerFrames;
      this.enter('stagger', 'stagger');
      this.setAnim('stagger');
    }
  }

  /** Höhe, die die aktuelle Abwehr schützt (oder null). */
  guardCovers(height: HitHeight, attackerX: number): boolean {
    if (this.state !== 'block' && this.state !== 'blockstun') return false;
    const fromFront = Math.sign(attackerX - this.x) === this.facing;
    if (!fromFront) return false;
    if (height === 'mittel') return true;
    return height === this.blockKind;
  }

  private updatePose(): void {
    const def = ANIMS[this.anim] as AnimDef;
    const total = animLength(this.anim);
    let f = this.animFrame;
    const looped = def.loop && f >= total;
    if (def.loop) f %= total;
    else if (f >= total) f = total - 1;
    let k = 0;
    let off = f;
    while (k < def.keys.length - 1 && off >= def.keys[k].dur) {
      off -= def.keys[k].dur;
      k++;
    }
    const key = def.keys[k];
    const target = POSES[key.pose];
    let prev: Pose;
    if (k === 0) prev = looped ? POSES[def.keys[def.keys.length - 1].pose] : this.fromPose;
    else prev = POSES[def.keys[k - 1].pose];
    const blend = key.blend ?? 2;
    const t = Math.min(1, (off + 1) / blend);
    lerpPose(prev, target, t, this.pose);
    computeSkeleton(this.pose, this.x, CONFIG.arena.groundY - this.air, this.facing, this.skel);
  }

  /** Nach externer Positionskorrektur (Kollision, Spielfeldrand) das Skelett neu berechnen. */
  refreshSkeleton(): void {
    computeSkeleton(this.pose, this.x, CONFIG.arena.groundY - this.air, this.facing, this.skel);
  }
}
