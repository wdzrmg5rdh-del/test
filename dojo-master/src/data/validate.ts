import { animLength } from './animations';
import { ATTACKS, MOVEMENT } from './moves';

/**
 * Prüft die Konsistenz der Daten: Angriffsanimationen müssen genau so lang sein
 * wie Anlauf + aktive Phase + Erholung, Flugbahnen müssen in die Animation passen.
 * Liefert eine Liste von Fehlermeldungen (leer = alles in Ordnung).
 */
export function validateData(): string[] {
  const errors: string[] = [];
  for (const a of Object.values(ATTACKS)) {
    const len = animLength(a.anim);
    const total = a.startup + a.active + a.recovery;
    if (len !== total) errors.push(`${a.id}: Animation ${len} Frames, Frame-Daten ${total}`);
    if (a.air && a.air.start + a.air.frames > total) errors.push(`${a.id}: Flugbahn länger als Animation`);
  }
  const arcs = [
    ['jump', MOVEMENT.jump],
    ['saltoVor', MOVEMENT.saltoVor],
    ['saltoRueck', MOVEMENT.saltoRueck],
  ] as const;
  for (const [anim, arc] of arcs) {
    if (arc.start + arc.frames > animLength(anim)) errors.push(`${anim}: Flugbahn länger als Animation`);
  }
  return errors;
}
