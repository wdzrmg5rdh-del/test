/**
 * Zentrale Konfiguration von Dojo Master.
 *
 * Alle Regel- und Balancingwerte stehen hier, damit sie ohne Änderungen am
 * Logikcode angepasst werden können. Punktwerte werden intern in halben
 * Punkten gezählt (1 = halber Punkt, 2 = ganzer Punkt).
 */

export type TieRule = 'zuletztGepunktet' | 'zuerstGepunktet' | 'losentscheid';

export type AttackId =
  | 'fauststossHoch'
  | 'fauststossTief'
  | 'kopfstoss'
  | 'frontTritt'
  | 'hoherTritt'
  | 'halbkreisTritt'
  | 'fussfeger'
  | 'flugTritt'
  | 'trittHinten'
  | 'fauststossHinten';

export interface BeltDef {
  /** Schlüssel in TEXT.belts */
  id: 'weiss' | 'gelb' | 'orange' | 'gruen' | 'blau' | 'braun' | 'schwarz';
  color: string;
  /** Gesamtpunktzahl, ab der dieser Gürtel erreicht ist. */
  minScore: number;
}

export interface AiLevel {
  /** Verzögerung in Frames, bis die KI eine sichtbare Animation wahrnimmt. */
  reactionFrames: number;
  /** Wahrscheinlichkeit, auf einen erkannten Angriff mit der richtigen Abwehr zu reagieren. */
  blockChance: number;
  /** 0..1, wie gern die KI angreift statt abzuwarten. */
  aggression: number;
  /** Wahrscheinlichkeit für eine Fehlentscheidung (falscher Angriff, falsche Abwehr, Zögern). */
  errorRate: number;
  /** Frames zwischen zwei taktischen Entscheidungen. */
  decisionInterval: number;
  /** Faktor auf die Schrittgeschwindigkeit. */
  walkSpeedFactor: number;
}

export const CONFIG = {
  screen: {
    width: 640,
    height: 360,
    /** Farbe der Restflächen außerhalb der skalierten Spielfläche. */
    borderColor: '#18181c',
  },

  loop: {
    updatesPerSecond: 60,
    /** Höchstzahl an Logikschritten pro gezeichnetem Bild (Schutz vor Spiralen). */
    maxStepsPerFrame: 5,
  },

  arena: {
    /** Y-Koordinate der Bodenlinie, auf der die Kämpfer stehen. */
    groundY: 318,
    minX: 58,
    maxX: 604,
    /** Ausgangspositionen der drei Kämpfer (links, Mitte, rechts). */
    startX: [176, 330, 484] as const,
    /** Halbe Körperbreite für die Kollision zwischen Kämpfern. */
    bodyHalfWidth: 11,
    /** Blickrichtung der drei Kämpfer zu Rundenbeginn (1 = rechts, -1 = links). */
    startFacing: [1, -1, -1] as const,
    /** Standort des Kampfrichters am linken Rand der Kampffläche. */
    refereeX: 24,
  },

  rules: {
    /** Dauer einer Kampfrunde in Sekunden. */
    roundSeconds: 30,
    /** Siegpunktzahl einer Runde in ganzen Punkten. */
    winPoints: 6,
    /** Gesamtpunkte, die ein halber Rundenpunkt am Rundenende einbringt. */
    scorePerHalfPoint: 100,
    /** Bonuspunkte je verbleibender Sekunde Rundenzeit (nur für den Rundensieger). */
    timeBonusPerSecond: 20,
    /** Regel zur Auflösung von Gleichständen in der Rundenwertung. */
    tieRule: 'zuletztGepunktet' as TieRule,
    /** Anzahl Kampfrunden zwischen zwei Bonusrunden. */
    fightRoundsPerBonus: 2,
    /** Punktwert je Angriff in halben Punkten (1 = halber, 2 = ganzer Punkt). */
    attackPoints: {
      fauststossHoch: 1,
      fauststossTief: 1,
      kopfstoss: 1,
      frontTritt: 1,
      hoherTritt: 1,
      halbkreisTritt: 2,
      fussfeger: 1,
      flugTritt: 2,
      trittHinten: 2,
      fauststossHinten: 1,
    } satisfies Record<AttackId, 1 | 2> as Record<AttackId, 1 | 2>,
  },

  /** Ablaufzeiten innerhalb einer Runde in Frames (60 Frames = 1 Sekunde). */
  timing: {
    roundIntroFrames: 90,
    resumeFrames: 45,
    hitStopFrames: 8,
    afterHitFrames: 110,
    roundEndFrames: 300,
    blockStunFrames: 12,
    staggerFrames: 34,
    knockdownFrames: 70,
  },

  /** Gürtelfolge mit Punkteschwellen der Gesamtpunktzahl. */
  belts: [
    { id: 'weiss', color: '#f0f0f0', minScore: 0 },
    { id: 'gelb', color: '#f0d020', minScore: 1500 },
    { id: 'orange', color: '#f08020', minScore: 3500 },
    { id: 'gruen', color: '#30a040', minScore: 6000 },
    { id: 'blau', color: '#3050e0', minScore: 9000 },
    { id: 'braun', color: '#7a4a20', minScore: 12500 },
    { id: 'schwarz', color: '#141414', minScore: 16500 },
  ] as BeltDef[],

  /** KI-Parameter je Gürtelstufe des (besten) menschlichen Spielers. */
  ai: [
    { reactionFrames: 30, blockChance: 0.12, aggression: 0.22, errorRate: 0.4, decisionInterval: 28, walkSpeedFactor: 0.8 },
    { reactionFrames: 25, blockChance: 0.22, aggression: 0.3, errorRate: 0.32, decisionInterval: 24, walkSpeedFactor: 0.86 },
    { reactionFrames: 21, blockChance: 0.32, aggression: 0.38, errorRate: 0.25, decisionInterval: 20, walkSpeedFactor: 0.92 },
    { reactionFrames: 17, blockChance: 0.42, aggression: 0.46, errorRate: 0.19, decisionInterval: 16, walkSpeedFactor: 0.98 },
    { reactionFrames: 14, blockChance: 0.52, aggression: 0.54, errorRate: 0.14, decisionInterval: 13, walkSpeedFactor: 1.04 },
    { reactionFrames: 11, blockChance: 0.62, aggression: 0.62, errorRate: 0.09, decisionInterval: 10, walkSpeedFactor: 1.1 },
    { reactionFrames: 9, blockChance: 0.72, aggression: 0.7, errorRate: 0.05, decisionInterval: 8, walkSpeedFactor: 1.16 },
  ] as AiLevel[],

  bonus: {
    /** Anzahl Objekte (Bälle und Bomben) je Bonusrunde. */
    objectCount: 26,
    /** Abstand zwischen zwei Objekten in Frames am Anfang und am Ende der Runde. */
    spawnIntervalStart: 72,
    spawnIntervalEnd: 30,
    /** Horizontale Ballgeschwindigkeit in Pixel pro Frame am Anfang und am Ende. */
    ballSpeedStart: 1.7,
    ballSpeedEnd: 4.2,
    /** Länge eines Sprungbogens der Bälle in Pixel. */
    bounceLength: 110,
    /** Gesamtpunkte je abgewehrtem Ball. */
    pointsPerBall: 50,
    /** Wahrscheinlichkeit, dass in Bonusrunde B statt eines Balls eine Bombe kommt. */
    bombChance: 0.28,
    /** Abzug bei Bombenkontakt. */
    bombPenalty: 100,
    /** Benommenheit nach Ball- oder Bombentreffer in Frames. */
    stunFrames: 40,
    bombStunFrames: 70,
    /** Positionen der Spieler in der Bonusrunde (1 bzw. 2 Spieler). */
    playerX1: [320],
    playerX2: [250, 390],
    introFrames: 120,
    outroFrames: 180,
  },

  input: {
    /** So viele Frames bleibt ein Tastendruck im Eingabepuffer gültig. */
    bufferFrames: 7,
    stickDeadzone: 0.5,
  },

  audio: {
    defaultVolume: 0.6,
  },

  highscore: {
    entries: 10,
    nameLength: 10,
  },
};

export type Config = typeof CONFIG;
