/** Hook that subscribes to a LiveCameraDetector's telemetry stream. */
import { useSyncExternalStore } from 'react';
import { LiveCameraDetector, type CameraTelemetry } from '@/detection/LiveCameraDetector';

const EMPTY: CameraTelemetry = {
  running: false,
  calibrated: false,
  markerCount: 0,
  fps: 0,
  lastError: null,
  lastFrame: null,
  video: null,
  canvas: null,
};

export function useCameraTelemetry(detector: LiveCameraDetector | null): CameraTelemetry {
  return useSyncExternalStore(
    (cb) => (detector ? detector.subscribeTelemetry(() => cb()) : () => {}),
    () => (detector ? detector.getTelemetry() : EMPTY),
  );
}
