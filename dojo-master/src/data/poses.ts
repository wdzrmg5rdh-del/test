import type { Pose } from '../fighter/skeleton';

/**
 * Schlüsselposen der Kämpfer als Gelenkwinkel (Grad, Blickrichtung rechts).
 * 0 = nach unten, 90 = nach vorn, 180 = nach oben, -90 = nach hinten.
 */

const STANCE: Pose = {
  hx: 0,
  rot: 0,
  torso: 172,
  head: 180,
  uaN: 38,
  laN: 122,
  uaF: 18,
  laF: 148,
  thN: 22,
  shN: 8,
  ftN: 90,
  thF: -20,
  shF: -12,
  ftF: 86,
};

function p(over: Partial<Pose>, base: Pose = STANCE): Pose {
  return { ...base, ...over };
}

const CROUCH = p({ torso: 152, head: 168, thN: 72, shN: -12, thF: 38, shF: -82, ftF: 95, uaN: 62, laN: 118, uaF: 35, laF: 140 });
const JUMP_CROUCH = p({ torso: 162, head: 172, thN: 55, shN: -28, thF: 30, shF: -48, uaN: -25, laN: -10, uaF: -35, laF: -20 });
const TUCK = p({ torso: 150, head: 140, thN: 118, shN: -15, thF: 108, shF: -25, uaN: 80, laN: 20, uaF: 70, laF: 10, ftN: 60, ftF: 60 });

export const POSES = {
  stance: STANCE,
  stanceBreath: p({ torso: 170, uaN: 40, laN: 125, thN: 23, thF: -21 }),
  ready: p({ torso: 180, head: 180, uaN: 8, laN: 12, uaF: -8, laF: -6, thN: 8, shN: 2, thF: -8, shF: -2, ftF: 90 }),
  walk1: p({ thN: 10, shN: 2, thF: -8, shF: -6, torso: 173 }),
  walk2: p({ thN: 30, shN: 16, thF: -30, shF: -20, torso: 171 }),
  walk3: p({ thN: -6, shN: -16, thF: 14, shF: 2, torso: 173 }),
  crouch: CROUCH,
  blockHigh: p({ torso: 178, head: 178, uaN: 140, laN: 218, uaF: 25, laF: 150 }),
  blockLow: p({ torso: 162, head: 172, uaN: 62, laN: 42, uaF: 22, laF: 148, thN: 30, shN: 14, thF: -26, shF: -16 }),
  blockShock: p({ torso: 185, head: 188, uaN: 140, laN: 218, uaF: 25, laF: 150 }),
  turn: p({ torso: 180, head: 180, uaN: 12, laN: 130, uaF: -12, laF: -130, thN: 6, shN: 0, thF: -6, shF: 0, ftN: 90, ftF: 90 }),

  jumpCrouch: JUMP_CROUCH,
  jumpAir: p({ torso: 175, head: 180, thN: 75, shN: -22, thF: 45, shF: -55, uaN: 120, laN: 165, uaF: 100, laF: 150, ftN: 80, ftF: 80 }),
  land: p({ torso: 160, head: 170, thN: 60, shN: -20, thF: 25, shF: -40, uaN: 60, laN: 110, uaF: 30, laF: 130 }),
  tuck0: p({ rot: 0 }, TUCK),
  tuck90: p({ rot: 90 }, TUCK),
  tuck180: p({ rot: 180 }, TUCK),
  tuck270: p({ rot: 270 }, TUCK),
  tuckM90: p({ rot: -90 }, TUCK),
  tuckM180: p({ rot: -180 }, TUCK),
  tuckM270: p({ rot: -270 }, TUCK),

  // Hoher Fauststoß
  punchHighWind: p({ torso: 176, uaN: -25, laN: 95, uaF: 30, laF: 150, thN: 26, shN: 10 }),
  punchHigh: p({ hx: 2, torso: 164, head: 172, uaN: 100, laN: 100, uaF: -20, laF: 70, thN: 32, shN: 14, thF: -26, shF: -18 }),
  // Tiefer Fauststoß (aus der Hocke)
  crouchPunchWind: p({ uaN: -15, laN: 85, uaF: 40, laF: 130 }, CROUCH),
  crouchPunch: p({ torso: 150, uaN: 72, laN: 78, uaF: -10, laF: 60 }, CROUCH),
  // Kopfstoß
  headbuttWind: p({ torso: 190, head: 196, uaN: 70, laN: 100, uaF: 55, laF: 95, thN: 18, thF: -18 }),
  headbutt: p({ hx: 4, torso: 148, head: 132, uaN: 40, laN: 60, uaF: 20, laF: 40, thN: 34, shN: 18, thF: -26, shF: -20 }),
  // Fronttritt
  frontKickWind: p({ torso: 186, head: 182, thN: 100, shN: 8, ftN: 60, thF: -4, shF: -4, uaN: 50, laN: 130 }),
  frontKick: p({ torso: 194, head: 186, thN: 95, shN: 92, ftN: 150, thF: -6, shF: -4, uaN: 40, laN: 120, uaF: -10, laF: 100 }),
  // Hoher Tritt
  highKickWind: p({ torso: 196, head: 186, thN: 128, shN: 5, ftN: 70, thF: -4, shF: -4, uaN: 60, laN: 140 }),
  highKick: p({ hx: 3, torso: 206, head: 190, thN: 132, shN: 136, ftN: 120, thF: -6, shF: -3, uaN: 30, laN: 110, uaF: -40, laF: 20 }),
  // Halbkreistritt (gedrehter Tritt)
  roundWind1: p({ torso: 180, head: 180, uaN: -40, laN: 20, uaF: 80, laF: 120, thN: 30, shN: 0, thF: -12, shF: -6 }),
  roundWind2: p({ torso: 200, head: 175, uaN: 150, laN: 90, uaF: -120, laF: -80, thN: 105, shN: -40, ftN: 60, thF: -5, shF: -4 }),
  roundKick: p({ hx: 4, torso: 222, head: 196, uaN: 160, laN: 110, uaF: -130, laF: -100, thN: 136, shN: 121, ftN: 105, thF: -8, shF: -4 }),
  // Fußfeger
  sweepWind: p({ torso: 145, head: 160, thN: 70, shN: -30, thF: 32, shF: -85, ftF: 95, uaN: 25, laN: 15, uaF: 10, laF: 10 }),
  sweep: p({ torso: 138, head: 150, thN: 80, shN: 88, ftN: 125, thF: 30, shF: -85, ftF: 95, uaN: 20, laN: 5, uaF: -15, laF: 0 }),
  // Flugtritt
  flyKickAir1: p({ torso: 180, head: 182, thN: 100, shN: 10, ftN: 70, thF: 55, shF: -45, uaN: 120, laN: 160, uaF: -60, laF: -40 }),
  flyKick: p({ torso: 202, head: 190, thN: 104, shN: 100, ftN: 110, thF: 60, shF: -42, uaN: 100, laN: 130, uaF: -110, laF: -80 }),
  // Tritt nach hinten
  backKickWind: p({ torso: 160, head: 160, thN: 55, shN: -70, ftN: 0, thF: 6, shF: 2, uaN: 70, laN: 120, uaF: 40, laF: 130 }),
  backKick: p({ hx: -2, torso: 140, head: 132, thN: -104, shN: -100, ftN: -170, thF: 14, shF: 6, uaN: 80, laN: 110, uaF: 60, laF: 90 }),
  // Fauststoß nach hinten
  backPunchWind: p({ torso: 172, head: 175, uaF: 45, laF: 100, uaN: 50, laN: 130 }),
  backPunch: p({ hx: -2, torso: 196, head: 188, uaF: -100, laF: -104, uaN: 60, laN: 120, thN: 14, shN: 4, thF: -26, shF: -18 }),

  // Getroffen, gestürzt, Siegerposen
  stagger1: p({ torso: 205, head: 214, uaN: 160, laN: 120, uaF: -150, laF: -130, thN: 32, shN: 12, thF: -10, shF: -6 }),
  stagger2: p({ torso: 192, head: 200, uaN: 120, laN: 80, uaF: -110, laF: -90, thN: 20, shN: 6, thF: -18, shF: -10 }),
  fall1: p({ rot: -35, torso: 200, head: 215, uaN: 150, laN: 130, uaF: 140, laF: 120, thN: 40, shN: 20, thF: 20, shF: 10, ftN: 120, ftF: 120 }),
  lying: p({ rot: -90, torso: 180, head: 186, uaN: 170, laN: 175, uaF: 150, laF: 160, thN: 8, shN: 2, thF: -4, shF: -2, ftN: 90, ftF: 90 }),
  bow: p({ torso: 138, head: 122, uaN: 10, laN: 10, uaF: -5, laF: -5, thN: 4, shN: 0, thF: -4, shF: 0, ftF: 90 }),
  victory: p({ torso: 180, head: 186, uaN: 168, laN: 176, uaF: 30, laF: 150, thN: 18, shN: 4, thF: -18, shF: -6 }),
  victory2: p({ torso: 180, head: 184, uaN: 160, laN: 172, uaF: 160, laF: 172, thN: 18, shN: 4, thF: -18, shF: -6 }),
  defeat: p({ torso: 160, head: 138, uaN: 4, laN: 6, uaF: -4, laF: -2, thN: 6, shN: 0, thF: -6, shF: 0, ftF: 90 }),

  // Bonusrunde: Schild in der nahen Hand
  shieldHigh: p({ torso: 176, head: 180, uaN: 140, laN: 128, uaF: 20, laF: 140, thN: 18, thF: -18 }),
  shieldMid: p({ torso: 174, head: 180, uaN: 82, laN: 92, uaF: 20, laF: 140, thN: 20, thF: -18 }),
  shieldLow: p({ uaN: 55, laN: 68, uaF: 30, laF: 130 }, CROUCH),
  shieldJump: p({ torso: 175, head: 180, thN: 75, shN: -22, thF: 45, shF: -55, uaN: 82, laN: 92, uaF: 100, laF: 150, ftN: 80, ftF: 80 }),
  shieldHit: p({ torso: 205, head: 214, uaN: 120, laN: 90, uaF: -150, laF: -130, thN: 32, shN: 12, thF: -10, shF: -6 }),
} satisfies Record<string, Pose>;

export type PoseId = keyof typeof POSES;
