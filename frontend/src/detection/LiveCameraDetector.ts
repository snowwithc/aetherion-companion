/**
 * Live camera detector - PHASE 2 placeholder.
 *
 * The real pipeline (Web Worker at ~10 fps: ArUco 4x4 markers -> homography -> top-down warp ->
 * zone crops -> ONNX YOLOv8n-cls -> debounce -> zone events) will be implemented behind this
 * same CardDetector interface. For now it only checks whether a camera and the model file exist,
 * reports "unavailable", and the app falls back to the Manual Simulator. It never throws.
 */
import { config } from '@/engine';
import { emptySnapshot, type CardDetector, type DetectorStatus, type ZoneEvent, type ZoneSnapshot } from './types';

/** True when a static file really exists (the dev server answers unknown paths with index.html). */
export async function assetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') ?? '';
    return !type.includes('text/html');
  } catch {
    return false;
  }
}

export class LiveCameraDetector implements CardDetector {
  readonly kind = 'camera' as const;
  private zones: ZoneSnapshot = emptySnapshot();
  private listeners = new Set<(e: ZoneEvent) => void>();

  async start(): Promise<DetectorStatus> {
    const cameraFound = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    const modelFound = await assetExists(config.detection.modelUrl);
    const markers: Record<number, boolean> = {};
    [0, 1, 2, 3, 10, 11, 12, 13, 14, 15, 16, 17].forEach((id) => (markers[id] = false));
    return {
      available: false,
      cameraFound,
      modelFound,
      markers,
      message: modelFound
        ? 'Live camera detection arrives in Phase 2. Use Manual mode for now.'
        : 'Model not found, use Manual mode.',
    };
  }

  stop() {
    /* Phase 2: stop the media stream and terminate the worker. */
  }

  subscribe(listener: (e: ZoneEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): ZoneSnapshot {
    return this.zones;
  }
}
