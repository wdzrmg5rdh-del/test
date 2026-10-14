import { CONFIG } from '../config';
import { POSES, type PoseId } from '../data/poses';
import { computeSkeleton, emptySkeleton } from '../fighter/skeleton';
import type { Referee } from '../rules/referee';
import { drawBubble } from './bubble';
import { drawFighter, drawShadow, GI_COLORS, REFEREE_LOOK } from './fighterRenderer';
import { rgb, type Surface } from './surface';

const skel = emptySkeleton();

const GESTURE_POSE: Record<Referee['gesture'], PoseId> = {
  stand: 'refStand',
  begin: 'refBegin',
  half: 'refHalf',
  full: 'refFull',
  stop: 'refStop',
  winner: 'refWinner',
  clash: 'refClash',
};

/** Standhöhe des Kampfrichters (etwas hinter der Kampflinie). */
export const REFEREE_GROUND = CONFIG.arena.groundY - 8;

export function drawReferee(s: Surface, r: Referee): void {
  const x = CONFIG.arena.refereeX;
  drawShadow(s, x, 0, REFEREE_GROUND);
  computeSkeleton(POSES[GESTURE_POSE[r.gesture]], x, REFEREE_GROUND, 1, skel);
  drawFighter(s, skel, REFEREE_LOOK, 1);
  // Fähnchen in der Farbe des Kämpfers, der gepunktet hat
  if (r.pointGi && (r.gesture === 'half' || r.gesture === 'full' || r.gesture === 'winner')) {
    const h = skel.handN;
    const c = rgb(GI_COLORS[r.pointGi].main);
    s.line(h.x, h.y + 2, h.x, h.y - 12, rgb('#5a3a1a'));
    s.fillRect(h.x + 1, h.y - 12, 9, 6, rgb('#141018'));
    s.fillRect(h.x + 1, h.y - 11, 8, 4, c);
  }
}

/** Sprechblase des Kampfrichters (über allem anderen gezeichnet). */
export function drawRefereeBubble(s: Surface, r: Referee): void {
  if (!r.message) return;
  computeSkeleton(POSES[GESTURE_POSE[r.gesture]], CONFIG.arena.refereeX, REFEREE_GROUND, 1, skel);
  drawBubble(s, r.message, CONFIG.arena.refereeX + 6, skel.head.y - 10);
}
