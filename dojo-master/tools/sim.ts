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
