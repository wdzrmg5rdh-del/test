/**
 * Seedbarer Pseudozufallsgenerator (mulberry32).
 * Die gesamte Spiellogik verwendet ausschließlich diesen Generator, damit
 * gleiche Eingaben und gleicher Seed stets zum gleichen Ergebnis führen.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Liefert eine Zahl im Bereich [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganze Zahl im Bereich [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Ganze Zahl im Bereich [min, max] (beide inklusive). */
  range(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  /** Gewichtete Auswahl; Gewichte <= 0 werden ignoriert. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const it of items) {
      const w = Math.max(0, weight(it));
      if (r < w) return it;
      r -= w;
    }
    return items[items.length - 1];
  }

  /** Erzeugt einen unabhängigen Untergenerator, deterministisch aus diesem abgeleitet. */
  fork(): Rng {
    return new Rng(Math.floor(this.next() * 4294967296));
  }

  getState(): number {
    return this.state;
  }
}
