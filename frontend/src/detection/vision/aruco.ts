/**
 * ArUco detection on top of js-aruco.
 *
 * js-aruco's own detect() only accepts markers whose outline is at least 20% of the frame
 * width - far too big for the small stickers on card fronts. We run the same steps
 * (grayscale -> adaptive threshold -> contours -> quads -> decode) but with a configurable
 * minimum marker size.
 */
import JsAruco, { type JsArucoDetector, type JsArucoImageLike } from 'js-aruco';

export interface ArucoCorner { x: number; y: number }
export interface ArucoMarker {
  id: number;
  corners: [ArucoCorner, ArucoCorner, ArucoCorner, ArucoCorner];
  center: ArucoCorner;
}

let detectorSingleton: JsArucoDetector | null = null;

function getDetector(): JsArucoDetector {
  if (detectorSingleton) return detectorSingleton;
  if (!JsAruco?.AR?.Detector) throw new Error('js-aruco not loaded');
  detectorSingleton = new JsAruco.AR.Detector();
  return detectorSingleton;
}

/** Exposed for the unit tests that cross-check our bit patterns against the library. */
export function arucoInternals(): JsArucoDetector {
  return getDetector();
}

/**
 * Run ArUco detection on an RGBA frame. Never throws - returns [] on error.
 * @param minSidePx smallest marker side (in frame pixels) we try to decode.
 */
export function detectMarkers(image: JsArucoImageLike, minSidePx = 14): ArucoMarker[] {
  try {
    const det = getDetector();
    const CV = JsAruco.CV;
    CV.grayscale(image, det.grey);
    CV.adaptiveThreshold(det.grey, det.thres, 2, 7);
    det.contours = CV.findContours(det.thres, det.binary);
    // findCandidates' minSize is a contour point count, roughly the marker perimeter.
    let candidates = det.findCandidates(det.contours, Math.max(24, minSidePx * 4), 0.05, Math.max(6, Math.round(minSidePx * 0.7)));
    candidates = det.clockwiseCorners(candidates);
    candidates = det.notTooNear(candidates, 10);
    const raw = det.findMarkers(det.grey, candidates, 49);
    return raw.map((m) => {
      const corners = m.corners.slice(0, 4).map((c) => ({ x: c.x, y: c.y })) as [ArucoCorner, ArucoCorner, ArucoCorner, ArucoCorner];
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

/** Mean marker side length in pixels. */
export function markerSize(m: ArucoMarker): number {
  const d = (a: ArucoCorner, b: ArucoCorner) => Math.hypot(a.x - b.x, a.y - b.y);
  return (d(m.corners[0], m.corners[1]) + d(m.corners[1], m.corners[2]) + d(m.corners[2], m.corners[3]) + d(m.corners[3], m.corners[0])) / 4;
}
