/**
 * Kopflose Tests der Spiellogik (ohne Browser): npm run sim
 */
import { validateData } from '../src/data/validate';
import { ATTACKS } from '../src/data/moves';
import { BUTTON_TABLE } from '../src/data/controls';
import { EventSink } from '../src/core/events';
import { Fighter } from '../src/fighter/fighter';
import { emptyInput, type FrameInput } from '../src/input/types';

let failures = 0;
function check(cond: boolean, msg: string): void {
  if (!cond) {
    failures++;
    console.log('FEHLER:', msg);
  }
}

const errs = validateData();
for (const e of errs) check(false, e);

// Jeder Angriff ist über die Steuerungstabelle erreichbar und endet wieder im Stand.
const dirs: Record<string, [number, number]> = {
  N: [0, 0], F: [1, 0], B: [-1, 0], U: [0, -1], D: [0, 1], UF: [1, -1], UB: [-1, -1], DF: [1, 1], DB: [-1, 1],
};
const reached = new Set<string>();
for (const button of ['punch', 'kick', 'block'] as const) {
  for (const [dir, [x, y]] of Object.entries(dirs)) {
    const action = BUTTON_TABLE[button][dir as keyof typeof dirs & string as never];
    const f = new Fighter(0, 'weiss', 320, 1, new EventSink());
    const inp: FrameInput = { ...emptyInput(), x: x as -1 | 0 | 1, y: y as -1 | 0 | 1 };
    inp[button] = true;
    inp[`${button}Pressed` as 'punchPressed'] = true;
    f.update(inp);
    reached.add(action);
    if (action in ATTACKS) {
      check(f.state === 'attack' && f.attack?.id === action, `${button}+${dir} sollte ${action} auslösen, ist ${f.state}`);
      let n = 0;
      let sawActive = false;
      while (f.state === 'attack' && n < 200) {
        f.update(emptyInput());
        if (f.attackPhase === 'active') sawActive = true;
        n++;
      }
      check(sawActive, `${action}: keine aktive Phase`);
      check(f.state === 'idle', `${action}: endet nicht im Stand`);
      check(f.air === 0, `${action}: landet nicht`);
    }
  }
}
for (const id of Object.keys(ATTACKS)) check(reached.has(id), `Angriff ${id} nicht erreichbar`);

console.log(failures === 0 ? 'Alle Prüfungen bestanden.' : `${failures} Fehler.`);
if (failures > 0) throw new Error('Simulation fehlgeschlagen');

// ---------------------------------------------------------------
// Reichweitentest: Bei welchen Abständen trifft welcher Angriff?
import { findCandidates } from '../src/combat/collision';
import type { AttackId } from '../src/config';

type TargetMode = 'stand' | 'crouch' | 'blockHoch' | 'blockTief' | 'jump';
function hitRange(id: AttackId, mode: TargetMode): [number, number] | null {
  const def = ATTACKS[id];
  let lo = Infinity, hi = -Infinity;
  for (let d = 22; d <= 130; d += 2) {
    const ev = new EventSink();
    const a = new Fighter(0, 'weiss', 300, 1, ev);
    const tx = def.backward ? 300 - d : 300 + d;
    const b = new Fighter(1, 'rot', tx, tx > 300 ? -1 : 1, ev);
    const bIn = { ...emptyInput() };
    if (mode === 'crouch') bIn.y = 1;
    if (mode === 'blockHoch' || mode === 'blockTief') {
      bIn.block = true;
      if (mode === 'blockTief') bIn.y = 1;
    }
    for (let i = 0; i < 10; i++) b.update(bIn);
    if (mode === 'jump') b.update({ ...emptyInput(), y: -1 });
    a.startAttack(def);
    let hit = false;
    for (let i = 0; i < 80 && a.state === 'attack'; i++) {
      a.update(emptyInput());
      b.update(mode === 'jump' ? emptyInput() : bIn);
      const c = findCandidates([a, b]).filter((x) => x.attacker === a);
      if (c.length > 0) {
        hit = !c[0].blocked;
        if (c[0].blocked) a.onAttackBlocked(b.x);
        break;
      }
    }
    if (hit) {
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
  }
  return lo === Infinity ? null : [lo, hi];
}

const fmtR = (r: [number, number] | null) => (r ? `${r[0]}-${r[1]}` : '---');
console.log('Angriff            stehend  geduckt  Abw.hoch Abw.tief springend');
for (const id of Object.keys(ATTACKS) as AttackId[]) {
  console.log(
    id.padEnd(18),
    fmtR(hitRange(id, 'stand')).padEnd(8),
    fmtR(hitRange(id, 'crouch')).padEnd(8),
    fmtR(hitRange(id, 'blockHoch')).padEnd(8),
    fmtR(hitRange(id, 'blockTief')).padEnd(8),
    fmtR(hitRange(id, 'jump')),
  );
}
for (const id of Object.keys(ATTACKS) as AttackId[]) {
  check(hitRange(id, 'stand') !== null, `${id} trifft keinen stehenden Gegner`);
}
check(hitRange('fussfeger', 'jump') === null, 'Fußfeger darf springende Gegner nicht treffen');
console.log(failures === 0 ? 'Reichweitentest bestanden.' : `${failures} Fehler.`);

// ---------------------------------------------------------------
// Rundensimulation mit KI-Kämpfern: Determinismus und Stärke je Stufe
import { AIController } from '../src/ai/ai';
import { CONFIG } from '../src/config';
import { Rng } from '../src/core/rng';
import { FightRound } from '../src/rules/round';

function simRound(seed: number, levels: number[]): { pts: number[]; first: number; frames: number; hash: number } {
  const rng = new Rng(seed);
  const ev = new EventSink();
  const gis = ['weiss', 'rot', 'blau'] as const;
  const fighters = [0, 1, 2].map((i) => {
    const f = new Fighter(i, gis[i], CONFIG.arena.startX[i], CONFIG.arena.startFacing[i], ev);
    f.walkSpeedFactor = CONFIG.ai[levels[i]].walkSpeedFactor;
    return f;
  });
  const ctrls = levels.map((l) => new AIController(CONFIG.ai[l], rng.fork()));
  const round = new FightRound(fighters, ctrls, ['W', 'R', 'B'], rng.fork(), ev);
  let frames = 0;
  let hash = 0;
  while (!round.isFinished && frames < 60 * 120) {
    round.update();
    ev.drain();
    frames++;
    for (const f of fighters) hash = (Math.imul(hash, 31) + Math.round(f.x * 16)) | 0;
  }
  check(round.isFinished, `Runde (Seed ${seed}) endet nicht`);
  return {
    pts: fighters.map((f) => f.roundPoints),
    first: round.result ? round.result.ranking[0].slot : -1,
    frames,
    hash,
  };
}

const r1 = simRound(1234, [0, 3, 6]);
const r2 = simRound(1234, [0, 3, 6]);
check(r1.hash === r2.hash && r1.pts.join() === r2.pts.join(), 'Simulation ist nicht deterministisch');
console.log('Determinismus:', r1.hash === r2.hash ? 'ok' : 'FEHLER', 'Punkte', r1.pts.join('/'));

for (const lv of [0, 2, 4, 6]) {
  let wins = 0, pts = 0, total = 0, rounds = 30;
  for (let i = 0; i < rounds; i++) {
    const r = simRound(1000 + i, [lv, 0, 0]);
    if (r.first === 0) wins++;
    pts += r.pts[0];
    total += r.pts.reduce((a, b) => a + b, 0);
  }
  console.log(`Stufe ${lv} gegen 2× Stufe 0: Siege ${wins}/${rounds}, Ø Halbpunkte ${(pts / rounds).toFixed(1)}, Ø Treffer gesamt ${(total / rounds).toFixed(1)}`);
}
console.log(failures === 0 ? 'Rundensimulation bestanden.' : `${failures} Fehler.`);
