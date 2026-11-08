/**
 * Thin TypeScript wrapper over js-aruco. One singleton AR.Detector is cached because
 * constructing it allocates several canvases and sub-detectors.
 * The detector reads a Canvas ImageData (RGBA) and returns the markers it recognised.
 */
import JsAruco from 'js-aruco';

export interface ArucoCorner { x: number; y: number }
export interface ArucoMarker {
  id: number;
  corners: [ArucoCorner, ArucoCorner, ArucoCorner, ArucoCorner];
  center: ArucoCorner;
}

type DetectorInstance = { detect(image: ImageData): Array<{ id: number; corners: Array<{ x: number; y: number }> }> };
let detectorSingleton: DetectorInstance | null = null;

function getDetector(): DetectorInstance {
  if (detectorSingleton) return detectorSingleton;
  const AR = JsAruco.AR;
  if (!AR?.Detector) throw new Error('js-aruco not loaded');
  detectorSingleton = new AR.Detector() as unknown as DetectorInstance;
  return detectorSingleton;
}

/** Run ArUco detection on an ImageData frame. Never throws - returns [] on error. */
export function detectMarkers(image: ImageData): ArucoMarker[] {
  try {
    const detector = getDetector();
    const raw = detector.detect(image);
    return raw.map((m) => {
      const corners = m.corners.slice(0, 4) as [ArucoCorner, ArucoCorner, ArucoCorner, ArucoCorner];
      const center: ArucoCorner = {
        x: corners.reduce((s, c) => s + c.x, 0) / 4,
        y: corners.reduce((s, c) => s + c.y, 0) / 4,
      };
      return { id: m.id, corners, center };
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('[aruco] detect error', err);
    return [];
  }
}

/** Mean marker side length in pixels - useful to size the zone polygons. */
export function markerSize(m: ArucoMarker): number {
  const d = (a: ArucoCorner, b: ArucoCorner) => Math.hypot(a.x - b.x, a.y - b.y);
  return (d(m.corners[0], m.corners[1]) + d(m.corners[1], m.corners[2]) + d(m.corners[2], m.corners[3]) + d(m.corners[3], m.corners[0])) / 4;
}
