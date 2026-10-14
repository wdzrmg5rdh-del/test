import { CONFIG } from '../config';
import { EventSink } from '../core/events';
import type { Game } from '../core/game';
import { drawBackground } from '../render/background';
import { drawFighter, drawShadow, giLook } from '../render/fighterRenderer';
import { drawText } from '../render/font';
import { rgb, shade, type Surface } from '../render/surface';
import { drawReferee, drawRefereeBubble } from '../render/refereeRenderer';
import { BonusRound, type BonusKind, type BonusObject, type BonusPlayer } from '../rules/bonus';
import { Referee } from '../rules/referee';
import { SLOT_GI, type Session } from '../rules/session';
import { TEXT } from '../texts';
import type { GameState } from './state';

/** Bonusrunde A (Bälle) oder B (Bälle und Bomben). */
export class BonusState implements GameState {
  private readonly events = new EventSink();
  private readonly round: BonusRound;
  private readonly referee = new Referee();
  private frame = 0;
  private done = false;
  private doneFrame = 0;
  private messages: string[] = [];

  constructor(
    private readonly game: Game,
    private readonly session: Session,
    readonly kind: BonusKind,
  ) {
    const players = session.activePlayers.map((p) => ({ player: p.player, gi: SLOT_GI[p.slot], beltIndex: p.beltIndex }));
    this.round = new BonusRound(kind, players, session.rng.fork(), this.events);
    this.referee.say(kind === 'A' ? TEXT.referee.bonusIntro : TEXT.referee.bonusIntroBombs, CONFIG.bonus.introFrames);
    this.referee.signal('begin', CONFIG.bonus.introFrames);
  }

  update(): void {
    this.frame++;
    const menu = this.game.input.sampleMenu();
    if (!this.done) {
      if (menu.pause) {
        this.game.flow.pause(this);
        return;
      }
      const inputs = this.round.players.map((p) => this.game.input.sample(p.player));
      const wasOutro = this.round.phase === 'outro';
      this.round.update(inputs);
      this.referee.update();
      if (!wasOutro && this.round.phase === 'outro') {
        this.referee.say(TEXT.referee.bonusEnd, CONFIG.bonus.outroFrames);
        this.referee.signal('winner', CONFIG.bonus.outroFrames, this.round.players[0].fighter.x, this.round.players[0].gi);
      }
      if (this.round.isFinished) {
        this.done = true;
        for (const p of this.round.players) {
          const msg = this.session.addBonus(p.player, p.points);
          if (msg) {
            this.messages.push(msg);
            this.events.sound('guertel');
          }
        }
      }
    } else {
      this.doneFrame++;
      this.round.update(this.round.players.map(() => null));
      if ((menu.confirm && this.doneFrame > 40) || this.doneFrame > 60 * 10) {
        this.game.flow.toStage(this.session, this.session.nextStage());
      }
    }
    this.game.audio.play(this.events.drain());
  }

  render(s: Surface): void {
    drawBackground(s, this.frame);
    drawReferee(s, this.referee);
    for (const o of this.round.objects) if (o.state !== 'gone') drawShadow(s, o.x, Math.max(30, o.h * 2));
    for (const p of this.round.players) {
      const f = p.fighter;
      drawShadow(s, f.x, f.air);
      drawFighter(s, f.skel, giLook(f.gi, CONFIG.belts[p.beltIndex].color), f.facing, p.stun > 0 && (p.stun >> 2) % 2 === 0);
      this.drawShield(s, p);
    }
    for (const o of this.round.objects) this.drawObject(s, o);
    for (const p of this.round.players) {
      for (const pp of p.popups) {
        drawText(s, pp.text, pp.x, pp.y - (45 - pp.frames) * 0.4, pp.text.startsWith('-') ? rgb('#ff5040') : rgb('#fff080'), {
          align: 'center',
          shadow: rgb('#141018'),
        });
      }
    }
    this.drawHud(s);
    drawRefereeBubble(s, this.referee);
    if (this.done) this.drawSummary(s);
  }

  private drawShield(s: Surface, p: BonusPlayer): void {
    const f = p.fighter;
    const h = f.skel.handN;
    const x = Math.round(h.x + f.facing * 3);
    const y = Math.round(h.y);
    const ink = rgb('#141018');
    s.fillEllipse(x, y, 4.5, 11, ink);
    s.fillEllipse(x, y, 3.5, 10, rgb('#b88838'));
    s.fillEllipse(x, y, 1.6, 3, rgb('#f0d070'));
    s.fillRect(x - 1, y - 9, 1, 18, rgb('#805818'));
  }

  private drawObject(s: Surface, o: BonusObject): void {
    if (o.state === 'gone') return;
    const x = o.x, y = CONFIG.arena.groundY - o.h;
    const ink = rgb('#141018');
    if (o.state === 'exploding') {
      const r = 4 + o.frame * 0.9;
      const fade = o.frame > 18;
      s.fillCircle(x, y, r + 2, fade ? rgb('#606060') : rgb('#f05020'));
      s.fillCircle(x, y, r, fade ? rgb('#909090') : rgb('#f8a030'));
      if (!fade) s.fillCircle(x, y, r * 0.5, rgb('#fff0a0'));
      return;
    }
    if (o.kind === 'bomb') {
      s.fillCircle(x, y, 6.5, ink);
      s.fillCircle(x, y, 5.5, rgb('#303040'));
      s.pset(x - 2, y - 3, rgb('#a0a0b8'));
      s.fillRect(x - 1, y - 8, 3, 2, rgb('#806040'));
      const spark = (o.frame >> 2) % 2 === 0 ? rgb('#fff080') : rgb('#f06020');
      s.fillRect(x + 1, y - 10, 2, 2, spark);
      return;
    }
    s.fillCircle(x, y, 6, ink);
    s.fillCircle(x, y, 5, rgb('#f4f0e8'));
    const band = o.level === 'hoch' ? rgb('#e04030') : o.level === 'mittel' ? rgb('#3070e0') : rgb('#30a040');
    s.fillRect(x - 5, y - 1, 10, 3, band);
    s.pset(x - 2, y - 3, rgb('#ffffff'));
    s.pset(x - 1, y - 3, rgb('#ffffff'));
  }

  private drawHud(s: Surface): void {
    const ink = rgb('#141018');
    const panel = rgb('#2a2430');
    const tc = rgb('#f4ecd8');
    const title = this.kind === 'A' ? TEXT.bonus.titleA : TEXT.bonus.titleB;
    s.fillRect(160, 3, 320, 18, ink);
    s.fillRect(161, 4, 318, 16, panel);
    drawText(s, title, 320, 8, rgb('#f8c838'), { align: 'center' });
    drawText(s, `${this.round.remaining}`, 470, 8, tc, { align: 'right' });
    this.round.players.forEach((p, i) => {
      const x0 = i === 0 ? 4 : 432;
      s.fillRect(x0, 26, 204, 40, ink);
      s.fillRect(x0 + 1, 27, 202, 38, panel);
      const prof = this.session.players.find((q) => q.player === p.player)!;
      drawText(s, this.session.hudLabel(prof.slot), x0 + 6, 31, tc);
      drawText(s, String(prof.score).padStart(6, '0'), x0 + 198, 31, rgb('#f8c838'), { align: 'right' });
      drawText(s, `${TEXT.bonus.deflected} ${p.deflected}`, x0 + 6, 43, tc);
      if (this.kind === 'B') drawText(s, `${TEXT.bonus.bombs} ${p.bombs}`, x0 + 110, 43, tc);
      drawText(s, `${TEXT.bonus.points} ${p.points >= 0 ? '+' : ''}${p.points}`, x0 + 6, 54, rgb('#80e0ff'));
    });
  }

  private drawSummary(s: Surface): void {
    const ink = rgb('#141018');
    const x0 = 150, y0 = 110, w = 340, h = 90 + this.messages.length * 10;
    s.fillRect(x0 - 2, y0 - 2, w + 4, h + 4, ink);
    s.fillRect(x0, y0, w, h, rgb('#2a2430'));
    s.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4, shade(rgb('#5a5060'), 1));
    drawText(s, TEXT.bonus.title, 320, y0 + 10, rgb('#f8c838'), { align: 'center', scale: 2 });
    this.round.players.forEach((p, i) => {
      const prof = this.session.players.find((q) => q.player === p.player)!;
      const y = y0 + 36 + i * 14;
      drawText(s, this.session.hudLabel(prof.slot), x0 + 12, y, rgb('#ffffff'));
      drawText(s, `${p.deflected}×`, x0 + 120, y, rgb('#f4ecd8'));
      drawText(s, `${p.points >= 0 ? '+' : ''}${p.points}`, x0 + 190, y, rgb('#80e0ff'));
      drawText(s, String(prof.score).padStart(6, '0'), x0 + w - 12, y, rgb('#f8c838'), { align: 'right' });
    });
    this.messages.forEach((m, i) => drawText(s, m, 320, y0 + 68 + i * 10, rgb('#80e0ff'), { align: 'center' }));
    if (this.doneFrame > 40 && (this.doneFrame >> 5) % 2 === 0) {
      drawText(s, TEXT.results.continue, 320, y0 + h - 14, rgb('#f4ecd8'), { align: 'center' });
    }
  }
}
