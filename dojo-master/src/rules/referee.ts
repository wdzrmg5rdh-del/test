/**
 * Zustand des Kampfrichters: Sprechblase und Geste.
 * Die Geste zeigt mit dem Arm auf den Kämpfer, der gepunktet hat
 * (waagrecht = halber Punkt, schräg nach oben = ganzer Punkt).
 */
export type Gesture = 'stand' | 'begin' | 'half' | 'full' | 'stop' | 'winner' | 'clash';

export class Referee {
  gesture: Gesture = 'stand';
  /** X-Position des Kämpfers, auf den gezeigt wird. */
  pointX = 0;
  /** Farbe des Kämpfers, auf den gezeigt wird (für das Fähnchen). */
  pointGi: 'weiss' | 'rot' | 'blau' | null = null;
  message: string | null = null;
  private messageFrames = 0;
  private gestureFrames = 0;
  frame = 0;

  say(text: string, frames = 100): void {
    this.message = text;
    this.messageFrames = frames;
  }

  signal(g: Gesture, frames = 100, pointX = 0, pointGi: Referee['pointGi'] = null): void {
    this.gesture = g;
    this.gestureFrames = frames;
    this.pointX = pointX;
    this.pointGi = pointGi;
  }

  clear(): void {
    this.message = null;
    this.messageFrames = 0;
    this.gesture = 'stand';
    this.gestureFrames = 0;
  }

  update(): void {
    this.frame++;
    if (this.messageFrames > 0 && --this.messageFrames === 0) this.message = null;
    if (this.gestureFrames > 0 && --this.gestureFrames === 0) this.gesture = 'stand';
  }
}
