/** Small deterministic PRNG utilities used by Demo Mode and AI strategies. */

export function hashString(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(key: string): () => number {
  return mulberry32(hashString(key));
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function pickN<T>(rng: () => number, items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Deterministic, smooth-ish noise in [-1, 1] for a numeric input. */
export function smoothNoise(seed: number, x: number): number {
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const t = x - x0;
  const a = mulberry32(seed ^ (x0 * 2654435761))() * 2 - 1;
  const b = mulberry32(seed ^ (x1 * 2654435761))() * 2 - 1;
  const s = t * t * (3 - 2 * t);
  return a + (b - a) * s;
}
