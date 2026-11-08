/**
 * The printed mat in paper millimetres (single source of truth: config.json -> mat).
 * The camera pipeline maps every marker into this space, so zone lookup does not care
 * how the phone is tilted or rotated.
 */
import configJson from '@/data/config.json';
import markersJson from '@/data/markers.json';
import type { ZoneId } from '@/engine/types';
import type { Pt } from './homography';

export type CornerName = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
export interface Rect { x: number; y: number; w: number; h: number }

export const MAT = configJson.mat;
export const MAT_ZONES: ZoneId[] = ['A', 'B', 'C', 'D'];
/** Clockwise from top-left - the order every corner array uses. */
export const CORNER_ORDER: CornerName[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
export const CORNER_IDS: Record<CornerName, number> = markersJson.corners as Record<CornerName, number>;
export const CARD_MARKERS: Record<string, string> = markersJson.cards as Record<string, string>;

export function cornerPaperPoint(name: CornerName): Pt {
  const c = MAT.cornerCenters[name];
  return { x: c.x, y: c.y };
}

export function zoneRect(z: ZoneId): Rect {
  return MAT.zones[z];
}

export function rectCorners(r: Rect): [Pt, Pt, Pt, Pt] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
}

export function rectCenter(r: Rect): Pt {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** 0 when the point is inside the rectangle, otherwise the distance to its edge (mm). */
export function distanceToRect(p: Pt, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Which zone a paper-space point belongs to (nearest zone within the tolerance), or null. */
export function zoneAt(p: Pt, tolerance: number = MAT.zoneTolerance): { zone: ZoneId; distance: number } | null {
  let best: { zone: ZoneId; distance: number } | null = null;
  for (const z of MAT_ZONES) {
    const d = distanceToRect(p, zoneRect(z));
    if (d <= tolerance && (!best || d < best.distance)) best = { zone: z, distance: d };
  }
  return best;
}
