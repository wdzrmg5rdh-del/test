import type { SoundId } from '../core/events';

/** Platzhalter, wird in Meilenstein 6 durch die Web-Audio-Synthese ersetzt. */
export class AudioSystem {
  play(_ids: readonly SoundId[]): void {}
  unlock(): void {}
}
