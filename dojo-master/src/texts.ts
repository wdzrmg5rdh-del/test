import type { AttackId } from './config';

/** Alle im Spiel angezeigten Texte (deutsch). */
export const TEXT = {
  gameName: 'Dojo Master',
  subtitle: 'Karate für drei',

  menu: {
    onePlayer: 'Ein Spieler',
    twoPlayers: 'Zwei Spieler',
    options: 'Optionen',
    controls: 'Steuerung',
    highscores: 'Bestenliste',
    pressKey: 'Taste drücken',
    resume: 'Fortsetzen',
    abort: 'Abbrechen',
    back: 'Zurück',
    pauseTitle: 'Pause',
    confirmAbort: 'Kampf wirklich abbrechen?',
    yes: 'Ja',
    no: 'Nein',
    hintNavigate: '↑↓ Auswahl   ENTER/Schlag Bestätigen   ESC Zurück',
    hintFullscreen: 'F9 Vollbild   F3 Debug   P/ESC Pause',
  },

  options: {
    title: 'Optionen',
    volume: 'Lautstärke',
    sound: 'Ton',
    on: 'An',
    off: 'Aus',
    fullscreen: 'Vollbild',
    keysP1: 'Tasten Spieler 1',
    keysP2: 'Tasten Spieler 2',
    padP1: 'Gamepad Spieler 1',
    padP2: 'Gamepad Spieler 2',
    defaults: 'Standardbelegung',
    defaultsDone: 'Wiederhergestellt',
    pressNewKey: 'Neue Taste drücken (ESC = Abbruch)',
    pressNewButton: 'Gamepadknopf drücken (ESC = Abbruch)',
    noPad: 'Kein Gamepad verbunden',
    reserved: 'Taste ist reserviert',
    actions: {
      up: 'Oben',
      down: 'Unten',
      left: 'Links',
      right: 'Rechts',
      punch: 'Schlag',
      kick: 'Tritt',
      block: 'Abwehr',
      pause: 'Pause',
    },
  },

  controls: {
    title: 'Steuerung',
    intro: 'Richtungen gelten relativ zur Blickrichtung (→ = vorwärts).',
    colDir: 'Richtung',
    dirs: {
      N: 'neutral',
      F: 'vor',
      B: 'zurück',
      U: 'oben',
      D: 'unten',
      UF: 'oben-vor',
      UB: 'oben-zurück',
      DF: 'unten-vor',
      DB: 'unten-zurück',
    },
    colNone: 'Ohne Taste',
    colPunch: 'Schlag',
    colKick: 'Tritt',
    colBlock: 'Abwehr',
    p1: 'Spieler 1',
    p2: 'Spieler 2',
    gamepad: 'Gamepad: Steuerkreuz/Stick, X Schlag, A Tritt, B Abwehr, Start Pause',
    abwehrHinweis: 'Abwehr halten: hoch schützt vor hohen und mittleren, tief vor tiefen und mittleren Angriffen.',
    bonus: 'Bonusrunde: ↑ · ↓ Schild hoch/mittel/tief, ← → umdrehen, Aktionstaste springen.',
  },

  moves: {
    stehen: 'Stehen',
    schrittVor: 'Schritt vor',
    schrittZurueck: 'Schritt zurück',
    sprung: 'Sprung',
    saltoVor: 'Salto vorwärts',
    saltoRueck: 'Salto rückwärts',
    ducken: 'Ducken',
    abwehrHoch: 'Abwehr hoch',
    abwehrTief: 'Abwehr tief',
    umdrehen: 'Umdrehen',
    fauststossHoch: 'Fauststoß hoch',
    fauststossTief: 'Fauststoß tief',
    kopfstoss: 'Kopfstoß',
    frontTritt: 'Fronttritt',
    hoherTritt: 'Hoher Tritt',
    halbkreisTritt: 'Halbkreistritt',
    fussfeger: 'Fußfeger',
    flugTritt: 'Flugtritt',
    trittHinten: 'Tritt nach hinten',
    fauststossHinten: 'Fauststoß hinten',
  } satisfies Record<AttackId | string, string>,

  fighters: {
    weiss: 'Weiß',
    rot: 'Rot',
    blau: 'Blau',
  },

  players: {
    p1: 'Spieler 1',
    p2: 'Spieler 2',
    cpu: 'Computer',
  },

  belts: {
    weiss: 'Weiß',
    gelb: 'Gelb',
    orange: 'Orange',
    gruen: 'Grün',
    blau: 'Blau',
    braun: 'Braun',
    schwarz: 'Schwarz',
  },

  hud: {
    highscore: 'Rekord',
    round: 'Runde',
    cpu: 'CPU',
  },

  referee: {
    begin: 'Kämpft!',
    resume: 'Weiter!',
    halfPoint: '{name}: halber Punkt!',
    fullPoint: '{name}: ganzer Punkt!',
    clash: 'Gleichzeitig – kein Punkt!',
    timeUp: 'Zeit!',
    stop: 'Halt!',
    winner: 'Sieger: {name}!',
    eliminated: '{name} scheidet aus!',
    tieDraw: 'Gleichstand – {name} liegt vorn.',
    bonusIntro: 'Bonusrunde! Wehre die Bälle ab!',
    bonusIntroBombs: 'Bonusrunde! Vorsicht vor Bomben!',
    bonusEnd: 'Gut gemacht!',
    beltUp: '{name}: neuer Gürtel – {belt}!',
  },

  results: {
    title: 'Rundenergebnis',
    place: '{n}. Platz',
    roundPoints: 'Rundenpunkte',
    total: 'Gesamt',
    out: 'Ausgeschieden',
    continue: 'Weiter mit ENTER/Schlag',
  },

  bonus: {
    title: 'Bonusrunde',
    titleA: 'Bonusrunde: Bälle',
    titleB: 'Bonusrunde: Bälle und Bomben',
    deflected: 'Abgewehrt',
    bombs: 'Bomben',
    points: 'Bonus',
  },

  gameOver: {
    title: 'Spielende',
    score: 'Punktzahl',
    belt: 'Gürtel',
    rounds: 'Runden',
    newHighscore: 'Neuer Eintrag in der Bestenliste!',
    enterName: 'Name eingeben: Tastatur oder ↑↓ Buchstabe, →← Position, ENTER fertig',
  },

  highscores: {
    title: 'Bestenliste',
    rank: 'Pl.',
    name: 'Name',
    score: 'Punkte',
    belt: 'Gürtel',
    empty: '---',
  },

  audioHint: 'Ton startet nach dem ersten Tastendruck',
};

/** Ersetzt Platzhalter wie {name} in einem Text. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}
