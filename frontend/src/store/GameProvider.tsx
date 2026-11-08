/**
 * Global game context: settings, campaign progress and the card detector.
 * In Phase 2 the active detector switches between Manual and Live Camera based on the
 * user's setting; one instance per mode lives for the whole session so the "mat" keeps
 * its cards when you move between screens - just like the real table.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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
  /** The detector currently active. Phase 2: can be either Manual or Camera. */
  detector: CardDetector;
  manual: ManualSimulatorDetector;
  camera: LiveCameraDetector;
  cameraActive: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const manualRef = useRef(new ManualSimulatorDetector());
  const cameraRef = useRef(new LiveCameraDetector());
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => setSfxEnabled(settings.sound), [settings.sound]);
  useEffect(() => {
    document.documentElement.classList.toggle('low-graphics', settings.lowGraphics);
  }, [settings.lowGraphics]);

  // Camera tuning + debug view follow the Settings screen.
  useEffect(() => {
    cameraRef.current.setTuning({ registerFrames: settings.registerFrames, clearFrames: settings.clearFrames });
  }, [settings.registerFrames, settings.clearFrames]);
  useEffect(() => {
    cameraRef.current.setDebug(settings.debugOverlay);
  }, [settings.debugOverlay]);

  // Start / stop the live camera when the detection mode changes.
  useEffect(() => {
    let cancelled = false;
    const cam = cameraRef.current;
    if (settings.detectionMode === 'camera') {
      (async () => {
        const status = await cam.start();
        if (cancelled) return;
        if (!status.available) {
          toast.warning(`${status.message} Kembali ke Mode Manual.`);
          setSettings((prev) => {
            const next = { ...prev, detectionMode: 'manual' as const };
            saveSettings(next);
            return next;
          });
          setCameraActive(false);
        } else {
          setCameraActive(true);
          toast.success(status.message);
        }
      })();
    } else {
      cam.stop();
      setCameraActive(false);
    }
    return () => {
      cancelled = true;
    };
  }, [settings.detectionMode]);

  useEffect(() => () => {
    cameraRef.current.stop();
  }, []);

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

  const detector: CardDetector = cameraActive ? cameraRef.current : manualRef.current;

  const value = useMemo<GameContextValue>(
    () => ({
      settings,
      updateSettings,
      progress,
      updateProgress,
      resetProgress,
      detector,
      manual: manualRef.current,
      camera: cameraRef.current,
      cameraActive,
    }),
    [settings, updateSettings, progress, updateProgress, resetProgress, detector, cameraActive],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
