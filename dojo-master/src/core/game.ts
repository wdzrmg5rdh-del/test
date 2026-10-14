import { AudioSystem } from '../audio/audio';
import { InputManager } from '../input/input';
import { Flow } from '../states/flow';
import { loadKeyboardLayout } from '../input/bindings';
import type { Surface } from '../render/surface';
import type { GameState } from '../states/state';
import { FixedLoop } from './loop';
import { Screen } from './screen';

/**
 * Hält die globalen Dienste (Bildschirm, Eingabe, Schleife) und den aktiven Spielzustand.
 */
export class Game {
  readonly screen: Screen;
  readonly input: InputManager;
  readonly loop: FixedLoop;
  readonly audio = new AudioSystem();
  readonly flow: Flow;
  debug = false;
  private state: GameState | null = null;
  private next: GameState | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.screen = new Screen(canvas);
    this.input = new InputManager(window);
    loadKeyboardLayout();
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // Vollbild muss direkt im Ereignis-Handler angefordert werden (Nutzeraktivierung).
      if (e.code === 'F9') Screen.toggleFullscreen();
      if (e.code === 'F3') this.debug = !this.debug;
    });
    this.flow = new Flow(this);
    this.loop = new FixedLoop(
      () => this.update(),
      () => this.render(),
    );
  }

  /** Bester Eintrag der Bestenliste. */
  highscore(): number {
    return 0;
  }

  setState(s: GameState): void {
    this.next = s;
  }

  get current(): GameState | null {
    return this.state;
  }

  start(initial?: GameState): void {
    if (initial) this.setState(initial);
    this.loop.start();
  }

  private update(): void {
    if (this.next) {
      this.state = this.next;
      this.next = null;
      this.input.resetEdges();
      this.state.enter?.();
    }
    this.input.poll();
    this.state?.update();
    this.input.endFrame();
  }

  private render(): void {
    const s: Surface = this.screen.surface;
    this.state?.render(s);
    this.screen.present();
  }
}
