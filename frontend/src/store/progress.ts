/** Campaign progress (saved in localStorage). */
import type { BattleState, RunState, WaveHeal } from '@/engine';
import { loadJson, saveJson } from './storage';

export type LastResult =
  | { type: 'waveCleared'; episodeId: string; waveIndex: number; enemyId: string; heal: WaveHeal }
  | { type: 'episodeVictory'; episodeId: string; enemyId: string }
  | { type: 'defeat'; episodeId: string; waveIndex: number; enemyId: string };

export interface Progress {
  version: 1;
  /** How many episodes are unlocked (1..3). */
  unlockedEpisodes: number;
  completedEpisodes: string[];
  /** Highest wave index cleared per episode in the current/last run (for the map). */
  clearedWaves: Record<string, number>;
  /** The run in progress (null = none). */
  run: RunState | null;
  /** Mid-battle snapshot so "Continue" resumes exactly where you left off. */
  battle: BattleState | null;
  lastResult: LastResult | null;
}

export const EMPTY_PROGRESS: Progress = {
  version: 1,
  unlockedEpisodes: 1,
  completedEpisodes: [],
  clearedWaves: {},
  run: null,
  battle: null,
  lastResult: null,
};

const KEY = 'aetherion.progress.v1';

export function loadProgress(): Progress {
  const p = loadJson<Progress | null>(KEY, null);
  if (!p || p.version !== 1) return { ...EMPTY_PROGRESS };
  return { ...EMPTY_PROGRESS, ...p };
}

export const saveProgress = (p: Progress) => saveJson(KEY, p);

/** Is there anything worth continuing? */
export const hasSave = (p: Progress) => !!p.run || p.completedEpisodes.length > 0 || p.unlockedEpisodes > 1;
