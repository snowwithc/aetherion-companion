/**
 * Vision pipeline (Phase 2b): markers -> table geometry -> paper-space zones.
 *
 * 1. Detect ArUco markers in the frame.
 * 2. Solve a homography from the 4 corner markers (camera px) to the printed mat (paper mm).
 *    - 3 corners visible: the 4th is estimated (parallelogram rule) -> "partial".
 *    - fewer: the last good geometry is held for geometryHoldMs (a hand over a corner) -> "held".
 * 3. Every card marker is mapped into paper mm and assigned to the nearest zone rectangle.
 *    Because zones are defined in paper space, tilting or rotating the phone does not move them.
 * 4. ZoneDebouncer turns noisy per-frame readings into stable placed/removed events.
 */
import { config } from '@/engine/data';
import type { ZoneId } from '@/engine/types';
import { detectMarkers, type ArucoMarker } from './aruco';
import { applyHomography, homographyFromPoints, type Mat3, type Pt } from './homography';
import { CARD_MARKERS, CORNER_IDS, CORNER_ORDER, MAT, MAT_ZONES, cornerPaperPoint, zoneAt, type CornerName } from './matLayout';

export type CalibrationState = 'ok' | 'partial' | 'held' | 'none';

export interface FrameReading {
  zone: ZoneId;
  cardId: string | null;
  confidence: number;
  marker?: ArucoMarker;
  /** Marker centre in paper millimetres. */
  paper?: Pt;
}

export interface Placement {
  markerId: number;
  cardId: string;
  zone: ZoneId | null;
  paper: Pt;
  camera: Pt;
  distance: number;
}

export interface PipelineOutput {
  markers: ArucoMarker[];
  readings: Record<ZoneId, FrameReading>;
  /** True whenever we have usable geometry (ok, partial or held). */
  calibrated: boolean;
  calibration: CalibrationState;
  cornersFound: CornerName[];
  corners: Partial<Record<CornerName, ArucoMarker>>;
  cameraToPaper: Mat3 | null;
  paperToCamera: Mat3 | null;
  /** ms since the geometry was last solved from real markers (0 when fresh). */
  geometryAgeMs: number;
  /** Every card marker seen this frame, including ones outside any zone. */
  placements: Placement[];
}

const CORNER_BY_ID = new Map<number, CornerName>(CORNER_ORDER.map((n) => [CORNER_IDS[n], n]));

export function emptyReadings(): Record<ZoneId, FrameReading> {
  return {
    A: { zone: 'A', cardId: null, confidence: 0 },
    B: { zone: 'B', cardId: null, confidence: 0 },
    C: { zone: 'C', cardId: null, confidence: 0 },
    D: { zone: 'D', cardId: null, confidence: 0 },
  };
}

function isFiniteMat(h: Mat3 | null): h is Mat3 {
  return !!h && h.every((v) => Number.isFinite(v));
}

/** Twice the signed area of a quad - used to reject degenerate (collinear) corner sets. */
function quadArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return Math.abs(a) / 2;
}

/**
 * Keeps the most recent good table geometry so a hand briefly covering a corner marker
 * does not drop calibration (and every card) mid-turn.
 */
export class GeometryTracker {
  private last: { h: Mat3; inv: Mat3; at: number } | null = null;

  constructor(private holdMs: number = config.detection.geometryHoldMs) {}

  setHoldMs(ms: number) {
    this.holdMs = ms;
  }

  reset() {
    this.last = null;
  }

  update(corners: Partial<Record<CornerName, ArucoMarker>>, now: number): {
    state: CalibrationState; h: Mat3 | null; inv: Mat3 | null; ageMs: number;
  } {
    const found = CORNER_ORDER.filter((n) => !!corners[n]);
    let cam: Pt[] | null = null;
    let state: CalibrationState = 'none';

    if (found.length === 4) {
      cam = CORNER_ORDER.map((n) => corners[n]!.center);
      state = 'ok';
    } else if (found.length === 3) {
      // Paper corners form a rectangle, so missing = adjacent1 + adjacent2 - opposite.
      // Exact for an affine view, a close estimate under mild perspective.
      const k = CORNER_ORDER.findIndex((n) => !corners[n]);
      const at = (i: number) => corners[CORNER_ORDER[(k + i) % 4]]!.center;
      const a1 = at(1);
      const opp = at(2);
      const a2 = at(3);
      const est = { x: a1.x + a2.x - opp.x, y: a1.y + a2.y - opp.y };
      cam = CORNER_ORDER.map((n, i) => (i === k ? est : corners[n]!.center));
      state = 'partial';
    }

    if (cam && quadArea(cam) > 100) {
      const paper = CORNER_ORDER.map(cornerPaperPoint);
      const h = homographyFromPoints(cam, paper);
      const inv = homographyFromPoints(paper, cam);
      if (isFiniteMat(h) && isFiniteMat(inv)) {
        this.last = { h, inv, at: now };
        return { state, h, inv, ageMs: 0 };
      }
    }

    if (this.last && now - this.last.at <= this.holdMs) {
      return { state: 'held', h: this.last.h, inv: this.last.inv, ageMs: now - this.last.at };
    }
    return { state: 'none', h: null, inv: null, ageMs: this.last ? now - this.last.at : 0 };
  }
}

/** Pure step: markers in, zone readings out (no image access - easy to unit test). */
export function analyseMarkers(markers: ArucoMarker[], tracker: GeometryTracker, now: number): PipelineOutput {
  const corners: Partial<Record<CornerName, ArucoMarker>> = {};
  for (const m of markers) {
    const name = CORNER_BY_ID.get(m.id);
    if (name) corners[name] = m;
  }
  const geo = tracker.update(corners, now);
  const readings = emptyReadings();
  const placements: Placement[] = [];

  if (geo.h) {
    const tolerance = MAT.zoneTolerance;
    const bestDist: Partial<Record<ZoneId, number>> = {};
    for (const m of markers) {
      if (CORNER_BY_ID.has(m.id)) continue;
      const cardId = CARD_MARKERS[String(m.id)];
      if (!cardId) continue;
      const paper = applyHomography(geo.h, m.center);
      const hit = zoneAt(paper, tolerance);
      placements.push({ markerId: m.id, cardId, zone: hit?.zone ?? null, paper, camera: m.center, distance: hit?.distance ?? Infinity });
      if (!hit) continue;
      const prev = bestDist[hit.zone];
      // Two markers in one zone (e.g. a card half-slid over another): the better-placed one wins.
      if (prev === undefined || hit.distance < prev) {
        bestDist[hit.zone] = hit.distance;
        // Inside the zone = full confidence; in the tolerance band it fades towards 0.5.
        const confidence = hit.distance === 0 ? 1 : Math.max(0.5, 1 - hit.distance / (2 * tolerance));
        readings[hit.zone] = { zone: hit.zone, cardId, confidence, marker: m, paper };
      }
    }
  }

  return {
    markers,
    readings,
    calibrated: geo.state !== 'none',
    calibration: geo.state,
    cornersFound: CORNER_ORDER.filter((n) => !!corners[n]),
    corners,
    cameraToPaper: geo.h,
    paperToCamera: geo.inv,
    geometryAgeMs: geo.ageMs,
    placements,
  };
}

/** Full step on an RGBA frame. */
export function analyseFrame(
  frame: { width: number; height: number; data: Uint8ClampedArray },
  tracker: GeometryTracker,
  now: number,
  minMarkerSidePx: number = config.detection.minMarkerSidePx,
): PipelineOutput {
  return analyseMarkers(detectMarkers(frame, minMarkerSidePx), tracker, now);
}

export interface ZoneProgress {
  stable: string | null;
  candidate: string | null;
  count: number;
  need: number;
}

/** Debounce readings so only stable cards produce zone events (register/clear counters). */
export class ZoneDebouncer {
  private stable: Record<ZoneId, string | null> = { A: null, B: null, C: null, D: null };
  private candidate: Record<ZoneId, { cardId: string | null; count: number }> = {
    A: { cardId: null, count: 0 },
    B: { cardId: null, count: 0 },
    C: { cardId: null, count: 0 },
    D: { cardId: null, count: 0 },
  };
  private registerFrames = config.detection.registerFrames;
  private clearFrames = config.detection.clearFrames;

  configure(register: number, clear: number) {
    this.registerFrames = Math.max(1, Math.round(register));
    this.clearFrames = Math.max(1, Math.round(clear));
  }

  private need(cardId: string | null) {
    return cardId === null ? this.clearFrames : this.registerFrames;
  }

  /**
   * Feed one frame; returns the zones whose stable card changed.
   * A marker that flickers out for a frame or two never produces a spurious event.
   */
  feed(readings: Record<ZoneId, { cardId: string | null }>): { zone: ZoneId; cardId: string | null }[] {
    const changes: { zone: ZoneId; cardId: string | null }[] = [];
    for (const z of MAT_ZONES) {
      const observed = readings[z].cardId;
      const cand = this.candidate[z];
      if (observed === cand.cardId) cand.count += 1;
      else {
        cand.cardId = observed;
        cand.count = 1;
      }
      if (cand.count >= this.need(observed) && this.stable[z] !== observed) {
        this.stable[z] = observed;
        changes.push({ zone: z, cardId: observed });
      }
    }
    return changes;
  }

  progress(): Record<ZoneId, ZoneProgress> {
    const out = {} as Record<ZoneId, ZoneProgress>;
    for (const z of MAT_ZONES) {
      const c = this.candidate[z];
      out[z] = { stable: this.stable[z], candidate: c.cardId, count: c.count, need: this.need(c.cardId) };
    }
    return out;
  }

  snapshot(): Record<ZoneId, string | null> {
    return { ...this.stable };
  }

  reset() {
    this.stable = { A: null, B: null, C: null, D: null };
    for (const z of MAT_ZONES) this.candidate[z] = { cardId: null, count: 0 };
  }
}
