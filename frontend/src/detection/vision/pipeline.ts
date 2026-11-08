/**
 * Vision pipeline: open a video stream, grab frames, detect markers, map marker IDs to
 * zone events, and run debounce.
 *
 * In Phase 2a the "zone" assignment is marker-position based (relative to the four corner
 * markers). The optional ONNX classifier hook is scaffolded but inert until a model is
 * dropped at the configured url.
 */
import { config, type ZoneId, ZONES } from '@/engine';
import markersJson from '@/data/markers.json';
import { detectMarkers, type ArucoMarker } from './aruco';

const CORNER_IDS = markersJson.corners;
const CARD_IDS: Record<string, string> = markersJson.cards;
const CORNER_SET = new Set<number>(Object.values(CORNER_IDS));

export interface FrameReading {
  zone: ZoneId;
  cardId: string | null;
  confidence: number;
  marker?: ArucoMarker;
}

export interface PipelineOutput {
  readings: Record<ZoneId, FrameReading>;
  markers: ArucoMarker[];
  /** All four corner markers located → calibration is good. */
  calibrated: boolean;
  corners: Partial<Record<keyof typeof CORNER_IDS, ArucoMarker>>;
}

const EMPTY: Record<ZoneId, FrameReading> = {
  A: { zone: 'A', cardId: null, confidence: 0 },
  B: { zone: 'B', cardId: null, confidence: 0 },
  C: { zone: 'C', cardId: null, confidence: 0 },
  D: { zone: 'D', cardId: null, confidence: 0 },
};

/**
 * Map a card marker to a zone. We use a simple layout: once the 4 corner markers are
 * located, the top-down mat is split into a 4x1 grid of zones A-D along the long axis
 * between topLeft -> topRight. Each card marker is placed into the zone whose rectangle
 * contains its centre, transformed into mat space.
 */
function cornerMap(markers: ArucoMarker[]): Partial<Record<keyof typeof CORNER_IDS, ArucoMarker>> {
  const out: Partial<Record<keyof typeof CORNER_IDS, ArucoMarker>> = {};
  for (const m of markers) {
    for (const [name, id] of Object.entries(CORNER_IDS)) {
      if (m.id === id) (out as Record<string, ArucoMarker>)[name] = m;
    }
  }
  return out;
}

/** Mat-space position (0..1, 0..1) using bilinear interpolation of the four corners. */
function matCoord(p: { x: number; y: number }, corners: Required<ReturnType<typeof cornerMap>>) {
  // Solve u,v in [0,1]^2 s.t. p = (1-u)(1-v)TL + u(1-v)TR + uv BR + (1-u)v BL
  // This has no closed form in general; we approximate via a few Newton iterations.
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  const TL = topLeft.center, TR = topRight.center, BR = bottomRight.center, BL = bottomLeft.center;
  let u = 0.5, v = 0.5;
  for (let iter = 0; iter < 20; iter++) {
    const fx = (1 - u) * (1 - v) * TL.x + u * (1 - v) * TR.x + u * v * BR.x + (1 - u) * v * BL.x - p.x;
    const fy = (1 - u) * (1 - v) * TL.y + u * (1 - v) * TR.y + u * v * BR.y + (1 - u) * v * BL.y - p.y;
    const dFx_du = -(1 - v) * TL.x + (1 - v) * TR.x + v * BR.x - v * BL.x;
    const dFx_dv = -(1 - u) * TL.x - u * TR.x + u * BR.x + (1 - u) * BL.x;
    const dFy_du = -(1 - v) * TL.y + (1 - v) * TR.y + v * BR.y - v * BL.y;
    const dFy_dv = -(1 - u) * TL.y - u * TR.y + u * BR.y + (1 - u) * BL.y;
    const det = dFx_du * dFy_dv - dFx_dv * dFy_du;
    if (Math.abs(det) < 1e-6) break;
    const du = (dFy_dv * fx - dFx_dv * fy) / det;
    const dv = (-dFy_du * fx + dFx_du * fy) / det;
    u -= du;
    v -= dv;
    if (Math.abs(du) + Math.abs(dv) < 1e-4) break;
  }
  return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
}

function zoneOf(u: number): ZoneId | null {
  if (u < 0 || u > 1) return null;
  const idx = Math.min(3, Math.max(0, Math.floor(u * 4)));
  return ZONES[idx];
}

export function analyseFrame(frame: ImageData): PipelineOutput {
  const markers = detectMarkers(frame);
  const corners = cornerMap(markers);
  const required: (keyof typeof CORNER_IDS)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  const calibrated = required.every((k) => !!corners[k]);

  if (!calibrated) {
    return { markers, readings: { ...EMPTY }, calibrated: false, corners };
  }

  const readings: Record<ZoneId, FrameReading> = {
    A: { zone: 'A', cardId: null, confidence: 0 },
    B: { zone: 'B', cardId: null, confidence: 0 },
    C: { zone: 'C', cardId: null, confidence: 0 },
    D: { zone: 'D', cardId: null, confidence: 0 },
  };
  for (const m of markers) {
    if (CORNER_SET.has(m.id)) continue;
    const cardId = CARD_IDS[String(m.id)];
    if (!cardId) continue;
    const { u } = matCoord(m.center, corners as Required<ReturnType<typeof cornerMap>>);
    const z = zoneOf(u);
    if (!z) continue;
    readings[z] = { zone: z, cardId, confidence: 1, marker: m };
  }
  return { markers, readings, calibrated: true, corners };
}

/** Debounce reading so only stable cards produce zone events (register/clear counters). */
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
    this.registerFrames = register;
    this.clearFrames = clear;
  }

  /**
   * Feed a frame: returns zones whose stable card id changed.
   * This never emits spurious events when a marker briefly disappears for a frame.
   */
  feed(readings: Record<ZoneId, FrameReading>): { zone: ZoneId; cardId: string | null }[] {
    const changes: { zone: ZoneId; cardId: string | null }[] = [];
    for (const z of ZONES) {
      const observed = readings[z].cardId;
      const cand = this.candidate[z];
      if (observed === cand.cardId) {
        cand.count += 1;
      } else {
        cand.cardId = observed;
        cand.count = 1;
      }
      const need = observed === null ? this.clearFrames : this.registerFrames;
      if (cand.count >= need && this.stable[z] !== observed) {
        this.stable[z] = observed;
        changes.push({ zone: z, cardId: observed });
      }
    }
    return changes;
  }

  snapshot(): Record<ZoneId, string | null> {
    return { ...this.stable };
  }

  reset() {
    this.stable = { A: null, B: null, C: null, D: null };
    this.candidate = {
      A: { cardId: null, count: 0 },
      B: { cardId: null, count: 0 },
      C: { cardId: null, count: 0 },
      D: { cardId: null, count: 0 },
    };
  }
}
