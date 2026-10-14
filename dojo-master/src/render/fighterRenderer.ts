import { CONFIG } from '../config';
import type { GiColor } from '../fighter/fighter';
import { BODY, type Pt, type Skeleton } from '../fighter/skeleton';
import { rgb, shade, type Surface } from './surface';

/** Farbsätze der drei Gi. */
export const GI_COLORS: Record<GiColor, { main: string; dark: string; light: string }> = {
  weiss: { main: '#e8e8ec', dark: '#a8a8bc', light: '#ffffff' },
  rot: { main: '#d23a2e', dark: '#8c2018', light: '#f06a50' },
  blau: { main: '#2f5fd8', dark: '#1c3488', light: '#6a92f4' },
};

const OUTLINE = rgb('#141018');
const SKIN = rgb('#e8b088');
const SKIN_DARK = rgb('#b87850');
const HAIR = rgb('#2a1c14');
const EYE = rgb('#141018');

export interface FighterLook {
  gi: GiColor;
  belt: string;
}

/** Zeichnet einen Schatten unter dem Kämpfer auf den Boden. */
export function drawShadow(s: Surface, x: number, air: number): void {
  const w = Math.max(8, 18 - air * 0.15);
  const y = CONFIG.arena.groundY;
  const c = rgb('#5a4a30');
  s.fillEllipse(x, y + 1, w, 2.6, c);
}

/**
 * Zeichnet den Kämpfer als gefüllte Gliedmaßen in Pixel-Optik. Erst wird die
 * gesamte Silhouette etwas größer in Umrissfarbe gezeichnet, dann die Füllung.
 */
export function drawFighter(s: Surface, k: Skeleton, look: FighterLook, facing: 1 | -1, flash = false): void {
  const g = GI_COLORS[look.gi];
  const main = flash ? rgb('#ffffff') : rgb(g.main);
  const dark = flash ? rgb('#dddddd') : rgb(g.dark);
  const belt = rgb(look.belt);
  const beltDark = shade(belt, 0.7);

  // Umriss-Durchgang
  silhouette(s, k, 1.2, OUTLINE);

  // Ferne Seite (dunkler)
  limb(s, k.neck, k.elbowF, BODY.upperArmR, dark);
  sleeve(s, k.elbowF, k.handF, BODY.foreArmR, dark, SKIN_DARK);
  s.fillCircle(k.handF.x, k.handF.y, BODY.handR, SKIN_DARK);
  limb(s, k.hip, k.kneeF, BODY.thighR, dark);
  limb(s, k.kneeF, k.ankleF, BODY.shinR, dark);
  s.capsule(k.ankleF.x, k.ankleF.y, k.toeF.x, k.toeF.y, BODY.footR, SKIN_DARK);

  // Rumpf
  torso(s, k, main, dark, facing);

  // Gürtel
  const bx = k.hip.x + (k.neck.x - k.hip.x) * 0.2;
  const by = k.hip.y + (k.neck.y - k.hip.y) * 0.2;
  const bx2 = k.hip.x + (k.neck.x - k.hip.x) * 0.27;
  const by2 = k.hip.y + (k.neck.y - k.hip.y) * 0.27;
  s.capsule(bx, by, bx2, by2, BODY.torsoR + 0.4, belt);
  // Knoten und Enden nach vorn
  const ux = (k.neck.x - k.hip.x) / BODY.torso;
  const uy = (k.neck.y - k.hip.y) / BODY.torso;
  const frx = -uy * facing, fry = ux * facing;
  const kx = (bx + bx2) / 2 + frx * (BODY.torsoR - 0.5);
  const ky = (by + by2) / 2 + fry * (BODY.torsoR - 0.5);
  s.fillRect(Math.round(kx) - 1, Math.round(ky) - 1, 3, 3, beltDark);
  s.line(kx, ky + 1, kx + frx * 2 - ux * 5, ky + 1 + fry * 2 - uy * 5, belt);
  s.line(kx + 1, ky + 1, kx + frx * 4 - ux * 4, ky + 1 + fry * 4 - uy * 4, belt);

  // Nahe Seite
  limb(s, k.hip, k.kneeN, BODY.thighR, main);
  limb(s, k.kneeN, k.ankleN, BODY.shinR, main);
  s.capsule(k.ankleN.x, k.ankleN.y, k.toeN.x, k.toeN.y, BODY.footR, SKIN);

  // Kopf
  head(s, k, facing);

  // Naher Arm
  limb(s, k.neck, k.elbowN, BODY.upperArmR, main);
  sleeve(s, k.elbowN, k.handN, BODY.foreArmR, main, SKIN);
  s.fillCircle(k.handN.x, k.handN.y, BODY.handR, SKIN);
  s.pset(k.handN.x, k.handN.y, SKIN_DARK);
}

function silhouette(s: Surface, k: Skeleton, o: number, c: number): void {
  s.capsule(k.neck.x, k.neck.y, k.elbowF.x, k.elbowF.y, BODY.upperArmR + o, c);
  s.capsule(k.elbowF.x, k.elbowF.y, k.handF.x, k.handF.y, BODY.foreArmR + o, c);
  s.fillCircle(k.handF.x, k.handF.y, BODY.handR + o, c);
  s.capsule(k.hip.x, k.hip.y, k.kneeF.x, k.kneeF.y, BODY.thighR + o, c);
  s.capsule(k.kneeF.x, k.kneeF.y, k.ankleF.x, k.ankleF.y, BODY.shinR + o, c);
  s.capsule(k.ankleF.x, k.ankleF.y, k.toeF.x, k.toeF.y, BODY.footR + o, c);
  s.capsule(k.hip.x, k.hip.y, k.neck.x, k.neck.y, BODY.torsoR + 1 + o, c);
  s.capsule(k.hip.x, k.hip.y, k.kneeN.x, k.kneeN.y, BODY.thighR + o, c);
  s.capsule(k.kneeN.x, k.kneeN.y, k.ankleN.x, k.ankleN.y, BODY.shinR + o, c);
  s.capsule(k.ankleN.x, k.ankleN.y, k.toeN.x, k.toeN.y, BODY.footR + o, c);
  s.fillCircle(k.head.x, k.head.y, BODY.headR + o, c);
  s.capsule(k.neck.x, k.neck.y, k.elbowN.x, k.elbowN.y, BODY.upperArmR + o, c);
  s.capsule(k.elbowN.x, k.elbowN.y, k.handN.x, k.handN.y, BODY.foreArmR + o, c);
  s.fillCircle(k.handN.x, k.handN.y, BODY.handR + o, c);
}

function limb(s: Surface, a: Pt, b: Pt, r: number, c: number): void {
  s.capsule(a.x, a.y, b.x, b.y, r, c);
}

/** Unterarm: vorn Ärmel, am Handgelenk Haut. */
function sleeve(s: Surface, a: Pt, b: Pt, r: number, cloth: number, skin: number): void {
  const mx = a.x + (b.x - a.x) * 0.62;
  const my = a.y + (b.y - a.y) * 0.62;
  s.capsule(mx, my, b.x, b.y, r - 0.8, skin);
  s.capsule(a.x, a.y, mx, my, r, cloth);
}

function torso(s: Surface, k: Skeleton, main: number, dark: number, facing: 1 | -1): void {
  s.capsule(k.hip.x, k.hip.y, k.neck.x, k.neck.y, BODY.torsoR + 1, main);
  const ux = (k.neck.x - k.hip.x) / BODY.torso;
  const uy = (k.neck.y - k.hip.y) / BODY.torso;
  // Normale zur Rückseite
  const nx = uy * facing;
  const ny = -ux * facing;
  // Ausschnitt (Haut) am Hals und Revers
  const vx = k.neck.x - ux * 3 - nx * 2.5;
  const vy = k.neck.y - uy * 3 - ny * 2.5;
  s.fillPoly(
    [
      [k.neck.x - nx * 4.5, k.neck.y - ny * 4.5],
      [k.neck.x - nx * 0.5, k.neck.y - ny * 0.5],
      [vx - ux * 4, vy - uy * 4],
    ],
    SKIN,
  );
  s.line(k.neck.x - nx * 4.5, k.neck.y - ny * 4.5, vx - ux * 6 - nx * 1.5, vy - uy * 6 - ny * 1.5, dark);
}

function head(s: Surface, k: Skeleton, facing: 1 | -1): void {
  const hx = k.head.x, hy = k.head.y;
  s.capsule(k.neck.x, k.neck.y, hx, hy, 2.6, SKIN_DARK);
  s.fillCircle(hx, hy, BODY.headR, SKIN);
  // Kopfrichtung (vom Hals zum Kopf)
  const ux = (hx - k.neck.x) / BODY.neck;
  const uy = (hy - k.neck.y) / BODY.neck;
  // Haar: hinterer und oberer Teil
  const r = BODY.headR;
  for (let yy = -Math.ceil(r); yy <= Math.ceil(r); yy++) {
    for (let xx = -Math.ceil(r); xx <= Math.ceil(r); xx++) {
      const d2 = (xx + 0.5) ** 2 + (yy + 0.5) ** 2;
      if (d2 > r * r) continue;
      // Lokale Koordinaten: entlang Kopfachse (up) und Blickrichtung (fwd)
      const up = (xx + 0.5) * ux + (yy + 0.5) * uy;
      const fwd = ((xx + 0.5) * -uy + (yy + 0.5) * ux) * facing;
      if (up > 1.5 || (fwd < -1.2 && up > -3.5)) s.pset(hx + xx, hy + yy, HAIR);
    }
  }
  // Auge und Ohr
  const fdx = -uy * facing, fdy = ux * facing;
  const ex = hx + fdx * 3.2 + ux * 0.6;
  const ey = hy + fdy * 3.2 + uy * 0.6;
  s.pset(ex, ey, EYE);
  s.pset(hx - fdx * 0.5, hy - fdy * 0.5 - uy * 0, SKIN_DARK);
}
