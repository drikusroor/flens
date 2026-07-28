/**
 * Seeded RNG. The engine threads the generator state through `GameState` so a
 * game is fully reproducible from (seed, action list) — which makes replays,
 * bug reports and AI self-play straightforward.
 */

/** mulberry32 — small, fast, good enough for shuffling cards. */
export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, state: t };
}

/** Fisher-Yates using the seeded generator. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: number): { items: T[]; rng: number } {
  const out = [...items];
  let state = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const next = nextRandom(state);
    state = next.state;
    const j = Math.floor(next.value * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return { items: out, rng: state };
}
