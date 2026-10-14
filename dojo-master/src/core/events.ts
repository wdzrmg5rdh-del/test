/**
 * Ereignisse, die die Spiellogik erzeugt und die von Audio und Darstellung
 * verarbeitet werden. Die Logik selbst greift nie auf Audio oder DOM zu.
 */
export type SoundId =
  | 'schlagLuft'
  | 'trittLuft'
  | 'trefferLeicht'
  | 'trefferSchwer'
  | 'abwehr'
  | 'aufprall'
  | 'sprung'
  | 'landung'
  | 'rundenbeginn'
  | 'rundenende'
  | 'punkt'
  | 'ballAbgewehrt'
  | 'ballVerfehlt'
  | 'bombe'
  | 'guertel'
  | 'menue'
  | 'menueBestaetigen'
  | 'schritt'
  | 'zeit';

export class EventSink {
  readonly sounds: SoundId[] = [];

  sound(id: SoundId): void {
    if (!this.sounds.includes(id)) this.sounds.push(id);
  }

  drain(): SoundId[] {
    const out = this.sounds.slice();
    this.sounds.length = 0;
    return out;
  }
}
