import { hurtCapsules, strikeCapsule } from '../combat/collision';
import type { Fighter } from '../fighter/fighter';
import { drawText } from './font';
import { rgb, type Surface } from './surface';

function circleOutline(s: Surface, cx: number, cy: number, r: number, c: number): void {
  const n = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s.pset(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
  }
}

function capsuleOutline(s: Surface, ax: number, ay: number, bx: number, by: number, r: number, c: number): void {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  circleOutline(s, ax, ay, r, c);
  if (len < 0.5) return;
  circleOutline(s, bx, by, r, c);
  const nx = (-dy / len) * r, ny = (dx / len) * r;
  s.line(ax + nx, ay + ny, bx + nx, by + ny, c);
  s.line(ax - nx, ay - ny, bx - nx, by - ny, c);
}

/** Debug-Overlay: Hurtboxes (grün), Hitboxes (rot), Zustände. */
export function drawDebugFighter(s: Surface, f: Fighter, extra: string | null): void {
  const green = rgb('#40ff60');
  for (const c of hurtCapsules(f)) capsuleOutline(s, c.ax, c.ay, c.bx, c.by, c.r, green);
  const hit = strikeCapsule(f);
  if (hit) {
    s.capsule(hit.ax, hit.ay, hit.bx, hit.by, hit.r, rgb('#ff3030'));
  } else if (f.attack) {
    s.pset(f.skel.handN.x, f.skel.handN.y, rgb('#ff8080'));
  }
  s.line(f.x, f.skel.hip.y - 2, f.x, f.skel.hip.y + 2, rgb('#ffff00'));
  const lines = [
    `${f.state} ${f.stateFrame}`,
    `${f.anim} ${f.animFrame}`,
    f.attack ? `${f.attack.id} ${f.attackPhase}` : '',
    extra ?? '',
  ].filter((l) => l.length > 0);
  const top = 150 + f.slot * 34;
  lines.forEach((l, i) =>
    drawText(s, l, f.x, top + i * 8, rgb('#ffff80'), { align: 'center', shadow: rgb('#000000') }),
  );
}
