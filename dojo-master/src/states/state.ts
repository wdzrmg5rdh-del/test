import type { Surface } from '../render/surface';

/** Ein Spielzustand (Titel, Kampf, Bonusrunde, Pause, Spielende, Menüs). */
export interface GameState {
  /** Ein Logikschritt (60 pro Sekunde). */
  update(): void;
  /** Zeichnet den Zustand in den Framebuffer. */
  render(s: Surface): void;
  /** Wird beim Aktivieren aufgerufen. */
  enter?(): void;
}
