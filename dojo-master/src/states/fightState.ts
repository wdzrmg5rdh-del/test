import { HumanController } from '../ai/human';
import { AIController } from '../ai/ai';
import type { Controller } from '../ai/controller';
import { CONFIG } from '../config';
import { EventSink } from '../core/events';
import type { Rng } from '../core/rng';
import type { Game } from '../core/game';
import type { Fighter } from '../fighter/fighter';
import { drawBackground } from '../render/background';
import { drawDebugFighter } from '../render/debugRenderer';
import { drawFighter, drawShadow, giLook } from '../render/fighterRenderer';
import { drawText } from '../render/font';
import { drawHud, drawPointSymbol } from '../render/hud';
import { drawReferee, drawRefereeBubble } from '../render/refereeRenderer';
import { rgb, type Surface } from '../render/surface';
import type { FightRound } from '../rules/round';
import type { RoundSummary, Session } from '../rules/session';
import { TEXT, fmt } from '../texts';
import type { GameState } from './state';

/** Eine Kampfrunde mit anschließender Ergebnisanzeige. */
export class FightState implements GameState {
  private readonly events = new EventSink();
  private round!: FightRound;
  private summary: RoundSummary | null = null;
  private summaryFrame = 0;
  private frame = 0;

  constructor(
    private readonly game: Game,
    private readonly session: Session,
  ) {}

  enter(): void {
    if (this.round) return;
    this.round = this.session.createRound(this.events, (slot, player, rng) => this.makeController(slot, player, rng));
  }

  private makeController(_slot: number, player: { player: 0 | 1 } | undefined, rng: Rng): Controller {
    if (player) return new HumanController(this.game.input, player.player);
    return new AIController(CONFIG.ai[this.session.aiLevel], rng);
  }

  update(): void {
    this.frame++;
    const menu = this.game.input.sampleMenu();
    if (!this.summary) {
      if (menu.pause) {
        this.game.flow.pause(this);
        return;
      }
      this.round.update();
      if (this.round.isFinished && this.round.result) {
        this.summary = this.session.applyRoundResult(this.round.result);
        this.summaryFrame = 0;
        if (this.summary.beltUp) this.events.sound('guertel');
      }
    } else {
      this.summaryFrame++;
      if ((menu.confirm && this.summaryFrame > 40) || this.summaryFrame > 60 * 12) this.next();
    }
    this.game.audio.play(this.events.drain());
  }

  private next(): void {
    const stage = this.session.nextStage();
    this.game.flow.toStage(this.session, stage);
  }

  render(s: Surface): void {
    drawBackground(s, this.frame);
    drawReferee(s, this.round.referee);
    const fighters = [...this.round.fighters].sort((a, b) => this.drawOrder(a) - this.drawOrder(b));
    for (const f of fighters) drawShadow(s, f.x, f.air);
    for (const f of fighters) {
      const flash = this.round.flash?.fighter === f && this.round.flash.frames % 2 === 0;
      drawFighter(s, f.skel, giLook(f.gi, CONFIG.belts[f.beltIndex].color), f.facing, flash);
    }
    drawHud(s, {
      fighters: this.round.fighters.map((f) => {
        const p = this.session.playerInSlot(f.slot);
        return {
          gi: f.gi,
          label: this.session.hudLabel(f.slot),
          roundPoints: f.roundPoints,
          human: !!p,
          score: p?.score ?? 0,
          beltIndex: f.beltIndex,
        };
      }),
      seconds: this.round.secondsLeft,
      highscore: this.game.highscore(),
      round: this.session.round,
    });
    drawRefereeBubble(s, this.round.referee);
    if (this.game.debug) {
      for (const f of this.round.fighters) drawDebugFighter(s, f, this.debugInfo(f));
      drawText(s, `FPS ${this.game.loop.fps} UPS ${this.game.loop.ups} SEED ${this.session.seed} PHASE ${this.round.phase}`, 4, 350, rgb('#ffff80'), { shadow: rgb('#000000') });
    }
    if (this.summary) this.renderSummary(s, this.summary);
  }

  private debugInfo(f: Fighter): string | null {
    const c = this.round.controllers[f.slot] as Controller & { debugState?: () => string };
    return c.debugState ? c.debugState() : c.human ? 'MENSCH' : null;
  }

  private drawOrder(f: Fighter): number {
    if (f.isDown) return 0;
    if (f.isHurt) return 1;
    if (f.state === 'attack') return 3;
    return 2;
  }

  private renderSummary(s: Surface, sum: RoundSummary): void {
    const ink = rgb('#141018');
    const x0 = 120, y0 = 92, w = 400, h = 150 + sum.messages.length * 10;
    s.ditherRect(0, 0, 640, 360, ink, this.frame >> 4);
    s.fillRect(x0 - 2, y0 - 2, w + 4, h + 4, ink);
    s.fillRect(x0, y0, w, h, rgb('#2a2430'));
    s.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4, rgb('#5a5060'));
    const tc = rgb('#f4ecd8');
    drawText(s, TEXT.results.title, 320, y0 + 10, rgb('#f8c838'), { align: 'center', scale: 2 });
    drawText(s, TEXT.results.roundPoints, x0 + 150, y0 + 36, rgb('#a098a8'));
    drawText(s, TEXT.results.total, x0 + w - 12, y0 + 36, rgb('#a098a8'), { align: 'right' });
    sum.lines.forEach((l, i) => {
      const y = y0 + 52 + i * 24;
      drawText(s, fmt(TEXT.results.place, { n: l.place }), x0 + 12, y, tc);
      drawText(s, l.name, x0 + 70, y, l.human ? rgb('#ffffff') : rgb('#c0b8c8'));
      for (let p = 0; p < CONFIG.rules.winPoints; p++) {
        drawPointSymbol(s, x0 + 156 + p * 12, y + 3, Math.max(0, Math.min(2, l.roundPoints - p * 2)));
      }
      if (l.human) {
        const add = `+${l.added}` + (l.timeBonus ? ` +${l.timeBonus}` : '');
        drawText(s, add, x0 + 236, y, tc);
        drawText(s, String(l.total).padStart(6, '0'), x0 + w - 12, y, rgb('#f8c838'), { align: 'right' });
        if (l.eliminated) drawText(s, TEXT.results.out, x0 + w - 12, y + 10, rgb('#ff6050'), { align: 'right' });
      }
    });
    sum.messages.forEach((m, i) => drawText(s, m, 320, y0 + 128 + i * 10, rgb('#80e0ff'), { align: 'center' }));
    if (this.summaryFrame > 40 && (this.summaryFrame >> 5) % 2 === 0) {
      drawText(s, TEXT.results.continue, 320, y0 + h - 14, tc, { align: 'center' });
    }
  }
}
