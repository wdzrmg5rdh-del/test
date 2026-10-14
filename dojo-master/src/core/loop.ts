import { CONFIG } from '../config';

/**
 * Spielschleife mit festem Zeitschritt (60 Logik-Updates pro Sekunde).
 * Rendering läuft über requestAnimationFrame und ist von der Logik entkoppelt:
 * Bei 144-Hz-Monitoren wird öfter gezeichnet, bei 30 Hz werden pro Bild
 * mehrere Logikschritte ausgeführt.
 */
export class FixedLoop {
  private acc = 0;
  private last = 0;
  private running = false;
  private readonly stepMs = 1000 / CONFIG.loop.updatesPerSecond;
  /** Gemessene Bild- und Updateraten für den Debug-Modus. */
  fps = 0;
  ups = 0;
  private fpsFrames = 0;
  private upsCount = 0;
  private fpsTime = 0;

  constructor(
    private readonly update: () => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.fpsTime = this.last;
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let delta = now - this.last;
    this.last = now;
    // Nach Tab-Wechsel o. Ä. nicht hunderte Schritte nachholen.
    if (delta > 250) delta = this.stepMs;
    this.acc += delta;
    let steps = 0;
    while (this.acc >= this.stepMs && steps < CONFIG.loop.maxStepsPerFrame) {
      this.update();
      this.acc -= this.stepMs;
      steps++;
      this.upsCount++;
    }
    if (steps >= CONFIG.loop.maxStepsPerFrame) this.acc = 0;
    this.render();
    this.fpsFrames++;
    if (now - this.fpsTime >= 1000) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsTime));
      this.ups = Math.round((this.upsCount * 1000) / (now - this.fpsTime));
      this.fpsFrames = 0;
      this.upsCount = 0;
      this.fpsTime = now;
    }
    requestAnimationFrame(this.frame);
  };
}
