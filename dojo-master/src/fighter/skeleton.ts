/**
 * Skelett und Vorwärtskinematik.
 *
 * Eine Pose ist ein Satz absoluter Gelenkwinkel in Grad (für einen nach rechts
 * blickenden Kämpfer). Winkelkonvention: 0 = nach unten, 90 = nach vorn,
 * 180 = nach oben, -90 = nach hinten. „N“ bezeichnet die dem Betrachter nahe
 * Körperseite (vorn gezeichnet), „F“ die ferne Seite.
 */

export interface Pose {
  /** Horizontaler Versatz der Hüfte gegenüber der Kämpferposition (vorwärts positiv). */
  hx: number;
  /** Drehung des ganzen Körpers um die Hüfte (positiv = vorwärts, für Saltos und Stürze). */
  rot: number;
  torso: number;
  head: number;
  uaN: number;
  laN: number;
  uaF: number;
  laF: number;
  thN: number;
  shN: number;
  ftN: number;
  thF: number;
  shF: number;
  ftF: number;
}

export const POSE_KEYS: (keyof Pose)[] = [
  'hx', 'rot', 'torso', 'head', 'uaN', 'laN', 'uaF', 'laF', 'thN', 'shN', 'ftN', 'thF', 'shF', 'ftF',
];

/** Längen und Radien der Gliedmaßen in logischen Pixeln. */
export const BODY = {
  torso: 28,
  neck: 10,
  headR: 6.5,
  upperArm: 15,
  foreArm: 14,
  handR: 2.6,
  thigh: 21,
  shin: 21,
  foot: 8,
  torsoR: 7,
  thighR: 4.6,
  shinR: 4,
  upperArmR: 3.6,
  foreArmR: 3.1,
  footR: 1.8,
};

export interface Pt {
  x: number;
  y: number;
}

/** Weltkoordinaten aller Gelenkpunkte einer Pose. */
export interface Skeleton {
  hip: Pt;
  neck: Pt;
  head: Pt;
  elbowN: Pt;
  handN: Pt;
  elbowF: Pt;
  handF: Pt;
  kneeN: Pt;
  ankleN: Pt;
  toeN: Pt;
  kneeF: Pt;
  ankleF: Pt;
  toeF: Pt;
}

export type JointName = keyof Skeleton;

const JOINTS: JointName[] = [
  'hip', 'neck', 'head', 'elbowN', 'handN', 'elbowF', 'handF', 'kneeN', 'ankleN', 'toeN', 'kneeF', 'ankleF', 'toeF',
];

/** Zusätzlicher Radius je Gelenk für die Bodenberechnung (unterster Körperpunkt steht auf dem Boden). */
const PLANT_RADIUS: Record<JointName, number> = {
  hip: BODY.torsoR,
  neck: BODY.torsoR,
  head: BODY.headR,
  elbowN: BODY.upperArmR,
  handN: BODY.handR,
  elbowF: BODY.upperArmR,
  handF: BODY.handR,
  kneeN: BODY.thighR,
  ankleN: BODY.footR,
  toeN: BODY.footR,
  kneeF: BODY.thighR,
  ankleF: BODY.footR,
  toeF: BODY.footR,
};

export function emptySkeleton(): Skeleton {
  const s = {} as Skeleton;
  for (const j of JOINTS) s[j] = { x: 0, y: 0 };
  return s;
}

const DEG = Math.PI / 180;

function setDir(out: Pt, from: Pt, angle: number, len: number): void {
  const a = angle * DEG;
  out.x = from.x + Math.sin(a) * len;
  out.y = from.y + Math.cos(a) * len;
}

/** Kürzeste Winkeldifferenz von a nach b in Grad. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function lerpPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  out.hx = a.hx + (b.hx - a.hx) * t;
  for (let i = 1; i < POSE_KEYS.length; i++) {
    const k = POSE_KEYS[i];
    out[k] = a[k] + angleDelta(a[k], b[k]) * t;
  }
  return out;
}

export function copyPose(src: Pose, out: Pose): Pose {
  for (const k of POSE_KEYS) out[k] = src[k];
  return out;
}

/**
 * Berechnet die Gelenkpunkte. Der Körper wird so verschoben, dass sein
 * tiefster Punkt auf baseY liegt (baseY = Boden minus Sprunghöhe).
 * facing = 1 blickt nach rechts, -1 nach links (Spiegelung an der Hüfte).
 */
export function computeSkeleton(p: Pose, x: number, baseY: number, facing: 1 | -1, out: Skeleton): Skeleton {
  const hip = out.hip;
  hip.x = p.hx;
  hip.y = 0;
  setDir(out.neck, hip, p.torso, BODY.torso);
  setDir(out.head, out.neck, p.head, BODY.neck);
  setDir(out.elbowN, out.neck, p.uaN, BODY.upperArm);
  setDir(out.handN, out.elbowN, p.laN, BODY.foreArm);
  setDir(out.elbowF, out.neck, p.uaF, BODY.upperArm);
  setDir(out.handF, out.elbowF, p.laF, BODY.foreArm);
  setDir(out.kneeN, hip, p.thN, BODY.thigh);
  setDir(out.ankleN, out.kneeN, p.shN, BODY.shin);
  setDir(out.toeN, out.ankleN, p.ftN, BODY.foot);
  setDir(out.kneeF, hip, p.thF, BODY.thigh);
  setDir(out.ankleF, out.kneeF, p.shF, BODY.shin);
  setDir(out.toeF, out.ankleF, p.ftF, BODY.foot);

  if (p.rot !== 0) {
    const a = p.rot * DEG;
    const c = Math.cos(a), s = Math.sin(a);
    for (const j of JOINTS) {
      const pt = out[j];
      const dx = pt.x - hip.x, dy = pt.y - hip.y;
      pt.x = hip.x + dx * c - dy * s;
      pt.y = hip.y + dx * s + dy * c;
    }
  }

  let maxY = -Infinity;
  for (const j of JOINTS) {
    const v = out[j].y + PLANT_RADIUS[j];
    if (v > maxY) maxY = v;
  }
  for (const j of JOINTS) {
    const pt = out[j];
    pt.x = x + pt.x * facing;
    pt.y = baseY + pt.y - maxY;
  }
  return out;
}
