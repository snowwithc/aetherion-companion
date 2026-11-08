/**
 * Campaign progression helpers (pure). The UI stores the result in localStorage.
 */
import { config, episodes, getEpisode } from './data';

export interface RunState {
  episodeId: string;
  waveIndex: number;
  characterId: string | null;
  hp: number;
  energy: number;
  /** HP / Energy at the start of the current wave (used by "Retry wave"). */
  waveStartHp: number;
  waveStartEnergy: number;
}

export function newRun(episodeId: string, characterId: string | null = null): RunState {
  const hp = config.player.startHp;
  const energy = config.player.startEnergy;
  return { episodeId, waveIndex: 0, characterId, hp, energy, waveStartHp: hp, waveStartEnergy: energy };
}

export interface WaveHeal {
  hpBefore: number;
  hpAfter: number;
  energyBefore: number;
  energyAfter: number;
}

/** Between waves: heal 25 HP and restore 50 Energy (capped). */
export function healBetweenWaves(hp: number, energy: number): WaveHeal {
  return {
    hpBefore: hp,
    hpAfter: Math.min(config.player.maxHp, hp + config.betweenWaves.healHp),
    energyBefore: energy,
    energyAfter: Math.min(config.player.maxEnergy, energy + config.betweenWaves.restoreEnergy),
  };
}

/** Advances a run to the next wave after a victory. */
export function advanceRun(run: RunState, endHp: number, endEnergy: number): { run: RunState; heal: WaveHeal } {
  const heal = healBetweenWaves(endHp, endEnergy);
  return {
    heal,
    run: { ...run, waveIndex: run.waveIndex + 1, hp: heal.hpAfter, energy: heal.energyAfter, waveStartHp: heal.hpAfter, waveStartEnergy: heal.energyAfter },
  };
}

export const isLastWave = (run: RunState) => run.waveIndex >= getEpisode(run.episodeId).waves.length - 1;

export const nextEpisodeId = (episodeId: string): string | null => {
  const i = episodes.findIndex((e) => e.id === episodeId);
  return i >= 0 && i < episodes.length - 1 ? episodes[i + 1].id : null;
};
