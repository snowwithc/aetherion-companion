/** Hook that subscribes to a LiveCameraDetector's telemetry stream (immutable snapshots). */
import { useCallback, useSyncExternalStore } from 'react';
import type { LiveCameraDetector, CameraTelemetry } from '@/detection/LiveCameraDetector';

const EMPTY: CameraTelemetry = {
  running: false,
  calibrated: false,
  markerCount: 0,
  fps: 0,
  analyseMs: 0,
  lastError: null,
  lastFrame: null,
  zoneProgress: null,
  topDown: null,
  topDownPxPerMm: 1,
  video: null,
  frameWidth: 0,
  frameHeight: 0,
};

export function useCameraTelemetry(detector: LiveCameraDetector | null): CameraTelemetry {
  const subscribe = useCallback(
    (cb: () => void) => (detector ? detector.subscribeTelemetry(() => cb()) : () => {}),
    [detector],
  );
  const get = useCallback(() => (detector ? detector.getTelemetry() : EMPTY), [detector]);
  return useSyncExternalStore(subscribe, get);
}
