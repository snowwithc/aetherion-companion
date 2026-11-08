/** React hooks for detectors. */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { CardDetector, ZoneEvent, ZoneSnapshot } from './types';

/** Live zone readings of a detector. */
export function useZoneSnapshot(detector: CardDetector): ZoneSnapshot {
  return useSyncExternalStore(
    (cb) => detector.subscribe(() => cb()),
    () => detector.getSnapshot(),
  );
}

/** Call `handler` for every zone event (handler can change between renders). */
export function useZoneEvents(detector: CardDetector, handler: (e: ZoneEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => detector.subscribe((e) => ref.current(e)), [detector]);
}
