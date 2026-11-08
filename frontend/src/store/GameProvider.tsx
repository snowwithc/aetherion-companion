/**
 * Global game context: settings, campaign progress and the card detector.
 * One ManualSimulatorDetector lives for the whole session, so the "mat" keeps
 * its cards when you move between screens - just like the real table.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ManualSimulatorDetector } from '@/detection/ManualSimulatorDetector';
import { LiveCameraDetector } from '@/detection/LiveCameraDetector';
import type { CardDetector } from '@/detection/types';
import { setSfxEnabled } from '@/audio/sfx';
import { loadSettings, saveSettings, type Settings } from './settings';
import { EMPTY_PROGRESS, loadProgress, saveProgress, type Progress } from './progress';

interface GameContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  progress: Progress;
  updateProgress: (fn: (p: Progress) => Progress) => void;
  resetProgress: () => void;
  /** The detector the game listens to. Phase 1: always the Manual Simulator. */
  detector: CardDetector;
  manual: ManualSimulatorDetector;
  camera: LiveCameraDetector;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const manualRef = useRef(new ManualSimulatorDetector());
  const cameraRef = useRef(new LiveCameraDetector());

  useEffect(() => setSfxEnabled(settings.sound), [settings.sound]);
  useEffect(() => {
    document.documentElement.classList.toggle('low-graphics', settings.lowGraphics);
  }, [settings.lowGraphics]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateProgress = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = { ...EMPTY_PROGRESS };
    saveProgress(fresh);
    setProgress(fresh);
    manualRef.current.clear(['A', 'B', 'C', 'D']);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      settings,
      updateSettings,
      progress,
      updateProgress,
      resetProgress,
      // Camera mode falls back to Manual until the Phase 2 camera layer exists.
      detector: manualRef.current,
      manual: manualRef.current,
      camera: cameraRef.current,
    }),
    [settings, updateSettings, progress, updateProgress, resetProgress],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
