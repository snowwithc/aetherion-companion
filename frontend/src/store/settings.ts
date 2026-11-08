/** Player settings (saved in localStorage). Detection defaults come from config.json. */
import { config } from '@/engine';
import { loadJson, saveJson } from './storage';

export type DetectionMode = 'manual' | 'camera';

export interface Settings {
  sound: boolean;
  detectionMode: DetectionMode;
  cameraId: string | null;
  confidenceThreshold: number;
  registerFrames: number;
  clearFrames: number;
  debugOverlay: boolean;
  lowGraphics: boolean;
  /** Stored for the upcoming i18n update (Bahasa Indonesia is the chosen default). */
  language: 'id' | 'en';
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  detectionMode: 'manual',
  cameraId: null,
  confidenceThreshold: config.detection.confidenceThreshold,
  registerFrames: config.detection.registerFrames,
  clearFrames: config.detection.clearFrames,
  debugOverlay: true,
  lowGraphics: false,
  language: 'id',
};

const KEY = 'aetherion.settings.v1';

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...loadJson<Partial<Settings>>(KEY, {}) });
export const saveSettings = (s: Settings) => saveJson(KEY, s);
