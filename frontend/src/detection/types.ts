/**
 * Card detection contract. Every detector (manual simulator, live camera) emits the SAME
 * zone events, so the game never knows (or cares) where a card placement came from.
 */
import type { ZoneId } from '@/engine';

export interface ZoneEvent {
  zone: ZoneId;
  /** Registered card id, or null when the zone became empty. */
  cardId: string | null;
  confidence: number;
  source: 'manual' | 'camera';
  at: number;
}

export interface ZoneReading {
  cardId: string | null;
  confidence: number;
  at: number;
}

export type ZoneSnapshot = Record<ZoneId, ZoneReading>;

export interface DetectorStatus {
  available: boolean;
  message: string;
  cameraFound?: boolean;
  modelFound?: boolean;
  /** ArUco marker id -> seen this frame (camera only). */
  markers?: Record<number, boolean>;
}

export interface CardDetector {
  readonly kind: 'manual' | 'camera';
  start(): Promise<DetectorStatus>;
  stop(): void;
  /** Listen to zone events. Returns an unsubscribe function. */
  subscribe(listener: (e: ZoneEvent) => void): () => void;
  /** Current zone readings (stable object between changes - safe for useSyncExternalStore). */
  getSnapshot(): ZoneSnapshot;
}

export const emptySnapshot = (): ZoneSnapshot => ({
  A: { cardId: null, confidence: 0, at: 0 },
  B: { cardId: null, confidence: 0, at: 0 },
  C: { cardId: null, confidence: 0, at: 0 },
  D: { cardId: null, confidence: 0, at: 0 },
});
