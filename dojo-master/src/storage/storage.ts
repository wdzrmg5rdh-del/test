import { CONFIG } from '../config';
import {
  BIND_ACTIONS,
  defaultKeyBindings,
  defaultPadBindings,
  PAD_ACTIONS,
  type KeyBindings,
  type PadBindings,
} from '../input/bindings';

/** Dauerhaft gespeicherte Einstellungen und Bestenliste (localStorage). */

const SETTINGS_KEY = 'dojo-master.einstellungen.v1';
const SCORES_KEY = 'dojo-master.bestenliste.v1';

export interface Settings {
  volume: number;
  muted: boolean;
  keys: [KeyBindings, KeyBindings];
  pads: [PadBindings, PadBindings];
}

export interface HighscoreEntry {
  name: string;
  score: number;
  belt: number;
}

export function defaultSettings(): Settings {
  return {
    volume: CONFIG.audio.defaultVolume,
    muted: false,
    keys: defaultKeyBindings(),
    pads: defaultPadBindings(),
  };
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher nicht verfügbar (z. B. privater Modus) */
  }
}

function isCodeList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === 'string');
}

export function loadSettings(): Settings {
  const s = defaultSettings();
  const raw = read(SETTINGS_KEY) as Partial<Settings> | null;
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1) s.volume = raw.volume;
  if (typeof raw.muted === 'boolean') s.muted = raw.muted;
  for (const p of [0, 1] as const) {
    const k = raw.keys?.[p];
    if (k) for (const a of BIND_ACTIONS) if (isCodeList(k[a])) s.keys[p][a] = k[a];
    const g = raw.pads?.[p];
    if (g) for (const a of PAD_ACTIONS) if (Number.isInteger(g[a]) && g[a] >= 0 && g[a] < 32) s.pads[p][a] = g[a];
  }
  return s;
}

export function saveSettings(s: Settings): void {
  write(SETTINGS_KEY, s);
}

/** Vorbelegte Bestenliste beim ersten Start. */
function defaultScores(): HighscoreEntry[] {
  const names = ['MEISTER', 'KRANICH', 'TIGER', 'BAMBUS', 'LOTUS', 'KIEFER', 'WELLE', 'STEIN', 'WIND', 'REGEN'];
  return names.map((name, i) => ({ name, score: 10000 - i * 1000, belt: Math.max(0, 5 - Math.floor(i / 2)) }));
}

export function loadHighscores(): HighscoreEntry[] {
  const raw = read(SCORES_KEY);
  if (!Array.isArray(raw)) return defaultScores();
  const list = raw
    .filter(
      (e): e is HighscoreEntry =>
        e && typeof e.name === 'string' && Number.isFinite(e.score) && Number.isInteger(e.belt),
    )
    .map((e) => ({
      name: e.name.slice(0, CONFIG.highscore.nameLength),
      score: Math.max(0, Math.floor(e.score)),
      belt: Math.max(0, Math.min(CONFIG.belts.length - 1, e.belt)),
    }));
  list.sort((a, b) => b.score - a.score);
  return list.slice(0, CONFIG.highscore.entries);
}

export function saveHighscores(list: HighscoreEntry[]): void {
  write(SCORES_KEY, list.slice(0, CONFIG.highscore.entries));
}

/** Platz (0-basiert), den eine Punktzahl in der Liste erreichen würde, oder -1. */
export function highscoreRank(list: HighscoreEntry[], score: number): number {
  if (score <= 0) return -1;
  for (let i = 0; i < CONFIG.highscore.entries; i++) {
    if (i >= list.length || score > list[i].score) return i;
  }
  return -1;
}

export function insertHighscore(list: HighscoreEntry[], entry: HighscoreEntry): HighscoreEntry[] {
  const out = [...list, entry].sort((a, b) => b.score - a.score).slice(0, CONFIG.highscore.entries);
  saveHighscores(out);
  return out;
}
