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
const EYE = rgb('#141018');

/** Aussehen einer Figur: Jacke, Hose, Gürtel, Haare, optional Bart. */
export interface FighterLook {
  top: number;
  topDark: number;
  pants: number;
  pantsDark: number;
  belt: number | null;
  hair: number;
  bald?: boolean;
  beard?: number;
}

export function giLook(gi: GiColor, beltHex: string): FighterLook {
  const g = GI_COLORS[gi];
  return {
    top: rgb(g.main),
    topDark: rgb(g.dark),
    pants: rgb(g.main),
    pantsDark: rgb(g.dark),
    belt: rgb(beltHex),
    hair: rgb('#2a1c14'),
  };
}

/** Der alte Kampfrichter: helle Jacke, dunkle Hakama, Glatze, weißer Bart. */
export const REFEREE_LOOK: FighterLook = {
  top: rgb('#d8d0c0'),
  topDark: rgb('#a89c88'),
  pants: rgb('#383848'),
  pantsDark: rgb('#262634'),
  belt: null,
  hair: rgb('#f0f0f0'),
  bald: true,
  beard: rgb('#f4f4f4'),
};

/** Zeichnet einen Schatten unter dem Kämpfer auf den Boden. */
export function drawShadow(s: Surface, x: number, air: number, groundY = CONFIG.arena.groundY): void {
  const w = Math.max(8, 18 - air * 0.15);
  s.fillEllipse(x, groundY + 1, w, 2.6, rgb('#6a5634'));
}

/**
 * Zeichnet die Figur als gefüllte Gliedmaßen in Pixel-Optik. Erst wird die
 * gesamte Silhouette etwas größer in Umrissfarbe gezeichnet, dann die Füllung.
 */
export function drawFighter(s: Surface, k: Skeleton, look: FighterLook, facing: 1 | -1, flash = false): void {
  const white = rgb('#ffffff');
  const top = flash ? white : look.top;
  const topDark = flash ? white : look.topDark;
  const pants = flash ? white : look.pants;
  const pantsDark = flash ? white : look.pantsDark;
  const wide = look.bald ? 1.4 : 0;

  silhouette(s, k, 1.2, OUTLINE, wide);

  // Ferne Seite (dunkler)
  limb(s, k.neck, k.elbowF, BODY.upperArmR, topDark);
  sleeve(s, k.elbowF, k.handF, BODY.foreArmR, topDark, SKIN_DARK);
  s.fillCircle(k.handF.x, k.handF.y, BODY.handR, SKIN_DARK);
  limb(s, k.hip, k.kneeF, BODY.thighR + wide, pantsDark);
  limb(s, k.kneeF, k.ankleF, BODY.shinR + wide, pantsDark);
  s.capsule(k.ankleF.x, k.ankleF.y, k.toeF.x, k.toeF.y, BODY.footR, SKIN_DARK);

  torso(s, k, top, topDark, facing);

  const ux = (k.neck.x - k.hip.x) / BODY.torso;
  const uy = (k.neck.y - k.hip.y) / BODY.torso;
  const frx = -uy * facing, fry = ux * facing;
  if (look.belt !== null) {
    const belt = flash ? white : look.belt;
    const beltDark = shade(belt, 0.7);
    // Gürtel als Band quer über die Hüfte
    const cx = k.hip.x + (k.neck.x - k.hip.x) * 0.24;
    const cy = k.hip.y + (k.neck.y - k.hip.y) * 0.24;
    const hw = BODY.torsoR + 1.2;
    s.fillPoly(
      [
        [cx - frx * hw - ux * 1.6, cy - fry * hw - uy * 1.6],
        [cx + frx * hw - ux * 1.6, cy + fry * hw - uy * 1.6],
        [cx + frx * hw + ux * 1.9, cy + fry * hw + uy * 1.9],
        [cx - frx * hw + ux * 1.9, cy - fry * hw + uy * 1.9],
      ],
      belt,
    );
    const bx = cx, by = cy, bx2 = cx, by2 = cy;
    // Knoten und Gürtelenden vorn
    const kx = (bx + bx2) / 2 + frx * (BODY.torsoR - 0.5);
    const ky = (by + by2) / 2 + fry * (BODY.torsoR - 0.5);
    s.fillRect(Math.round(kx) - 1, Math.round(ky) - 1, 3, 3, beltDark);
    s.line(kx, ky + 1, kx + frx * 2 - ux * 5, ky + 1 + fry * 2 - uy * 5, belt);
    s.line(kx + 1, ky + 1, kx + frx * 4 - ux * 4, ky + 1 + fry * 4 - uy * 4, belt);
  } else {
    // Hakama-Bund
    s.capsule(k.hip.x, k.hip.y, k.hip.x + ux * 6, k.hip.y + uy * 6, BODY.torsoR + 0.8, pants);
  }

  // Nahe Seite
  limb(s, k.hip, k.kneeN, BODY.thighR + wide, pants);
  limb(s, k.kneeN, k.ankleN, BODY.shinR + wide, pants);
  s.capsule(k.ankleN.x, k.ankleN.y, k.toeN.x, k.toeN.y, BODY.footR, SKIN);

  head(s, k, facing, look);

  limb(s, k.neck, k.elbowN, BODY.upperArmR, top);
  sleeve(s, k.elbowN, k.handN, BODY.foreArmR, top, SKIN);
  s.fillCircle(k.handN.x, k.handN.y, BODY.handR, SKIN);
  s.pset(k.handN.x, k.handN.y, SKIN_DARK);
}

function silhouette(s: Surface, k: Skeleton, o: number, c: number, wide: number): void {
  s.capsule(k.neck.x, k.neck.y, k.elbowF.x, k.elbowF.y, BODY.upperArmR + o, c);
  s.capsule(k.elbowF.x, k.elbowF.y, k.handF.x, k.handF.y, BODY.foreArmR + o, c);
  s.fillCircle(k.handF.x, k.handF.y, BODY.handR + o, c);
  s.capsule(k.hip.x, k.hip.y, k.kneeF.x, k.kneeF.y, BODY.thighR + wide + o, c);
  s.capsule(k.kneeF.x, k.kneeF.y, k.ankleF.x, k.ankleF.y, BODY.shinR + wide + o, c);
  s.capsule(k.ankleF.x, k.ankleF.y, k.toeF.x, k.toeF.y, BODY.footR + o, c);
  s.capsule(k.hip.x, k.hip.y, k.neck.x, k.neck.y, BODY.torsoR + 1 + o, c);
  s.capsule(k.hip.x, k.hip.y, k.kneeN.x, k.kneeN.y, BODY.thighR + wide + o, c);
  s.capsule(k.kneeN.x, k.kneeN.y, k.ankleN.x, k.ankleN.y, BODY.shinR + wide + o, c);
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

function head(s: Surface, k: Skeleton, facing: 1 | -1, look: FighterLook): void {
  const hx = k.head.x, hy = k.head.y;
  s.capsule(k.neck.x, k.neck.y, hx, hy, 2.6, SKIN_DARK);
  s.fillCircle(hx, hy, BODY.headR, SKIN);
  const ux = (hx - k.neck.x) / BODY.neck;
  const uy = (hy - k.neck.y) / BODY.neck;
  const r = BODY.headR;
  for (let yy = -Math.ceil(r); yy <= Math.ceil(r); yy++) {
    for (let xx = -Math.ceil(r); xx <= Math.ceil(r); xx++) {
      const px = xx + 0.5, py = yy + 0.5;
      if (px * px + py * py > r * r) continue;
      // Lokale Koordinaten: entlang der Kopfachse (up) und in Blickrichtung (fwd)
      const up = px * ux + py * uy;
      const fwd = (px * -uy + py * ux) * facing;
      if (look.bald) {
        // Haarkranz hinten, Bart vorn unten
        if (fwd < -2.5 && up < 1.5 && up > -3) s.pset(hx + xx, hy + yy, look.hair);
        if (look.beard !== undefined && fwd > -1 && up < -1.8) s.pset(hx + xx, hy + yy, look.beard);
      } else if (up > 1.5 || (fwd < -1.2 && up > -3.5)) {
        s.pset(hx + xx, hy + yy, look.hair);
      }
    }
  }
  const fdx = -uy * facing, fdy = ux * facing;
  if (look.beard !== undefined) {
    // Bartspitze unter dem Kinn
    s.capsule(hx + fdx * 2 - ux * 5, hy + fdy * 2 - uy * 5, hx + fdx * 3 - ux * 10, hy + fdy * 3 - uy * 10, 1.6, look.beard);
    s.capsule(hx + fdx * 3 + ux * 2.5, hy + fdy * 3 + uy * 2.5, hx + fdx * 5 + ux * 2.5, hy + fdy * 5 + uy * 2.5, 0.8, look.beard);
  }
  const ex = hx + fdx * 3.2 + ux * 0.6;
  const ey = hy + fdy * 3.2 + uy * 0.6;
  s.pset(ex, ey, EYE);
}
