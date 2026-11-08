/** Small random helpers. The engine never calls Math.random directly - an Rng is injected. */
import type { Rng } from './types';

export const defaultRng: Rng = () => Math.random();

/** Roll a six-sided die (1-6). */
export const d6 = (rng: Rng): number => 1 + Math.floor(rng() * 6);

/** Deterministic RNG (mulberry32) for tests and replays. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rng that returns preset d6 results in order (for unit tests). */
export function scriptedDice(rolls: number[], fallback = 1): Rng {
  let i = 0;
  return () => {
    const r = i < rolls.length ? rolls[i++] : fallback;
    return (r - 1) / 6 + 0.0001;
  };
}
