import type { Fighter } from '../fighter/fighter';
import type { InputManager } from '../input/input';
import type { FrameInput } from '../input/types';
import type { Controller } from './controller';

/** Steuerung durch einen menschlichen Spieler (Tastatur oder Gamepad). */
export class HumanController implements Controller {
  readonly human = true;
  constructor(
    private readonly input: InputManager,
    readonly player: 0 | 1,
  ) {}

  next(_self: Fighter, _all: readonly Fighter[]): FrameInput {
    return this.input.sample(this.player);
  }
}
