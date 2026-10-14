import type { Fighter } from '../fighter/fighter';
import type { FrameInput } from '../input/types';

/** Liefert pro Logikschritt die Eingaben eines Kämpfers (Mensch oder KI). */
export interface Controller {
  readonly human: boolean;
  next(self: Fighter, all: readonly Fighter[]): FrameInput;
}
