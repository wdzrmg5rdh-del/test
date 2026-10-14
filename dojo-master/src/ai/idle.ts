import type { Fighter } from '../fighter/fighter';
import { emptyInput, type FrameInput } from '../input/types';
import type { Controller } from './controller';

/** Ein Kämpfer ohne Eingaben (Platzhalter, z. B. für Tests). */
export class IdleController implements Controller {
  readonly human = false;
  next(_self: Fighter, _all: readonly Fighter[]): FrameInput {
    return emptyInput();
  }
}
