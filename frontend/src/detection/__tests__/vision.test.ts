/**
 * Vision tests (Phase 2b). Run with: cd frontend && CI=true yarn test --watchAll=false src/detection
 *
 * The synthetic-scene tests render the printed mat (markers + stickered cards) through a
 * perspective camera, then run the real detection pipeline on those pixels. That proves the
 * homography warp keeps zone assignment right when the phone is tilted or rotated.
 */
import { ALL_CARD_IDS } from '@/engine';
import markersJson from '@/data/markers.json';
import { arucoInternals } from '../vision/aruco';
import { applyHomography, homographyFromPoints, type Pt } from '../vision/homography';
import { codeDistance, decodeBits, markerDataBits, markerGrid, rotateBits, rotationMargin } from '../vision/markerBits';
import { CORNER_IDS, CORNER_ORDER, MAT, cornerPaperPoint, rectCenter, zoneAt, zoneRect, type CornerName } from '../vision/matLayout';
import { analyseFrame, analyseMarkers, GeometryTracker, ZoneDebouncer } from '../vision/pipeline';
import { warpTopDown } from '../vision/warp';

const idForCard = (cardId: string) => Number(Object.entries(markersJson.cards).find(([, c]) => c === cardId)![0]);

// ---------------------------------------------------------------- synthetic scene
interface SceneMarker { cx: number; cy: number; size: number; id: number; quarterTurns?: number }
interface SceneCard { zone: 'A' | 'B' | 'C' | 'D'; cardId: string; quarterTurns?: number; dx?: number; dy?: number }

function rotateGrid(grid: number[][], turns = 0) {
  let g = grid;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) g = rotateBits(g);
  return g;
}

function buildScene(cards: SceneCard[], omitCorners: CornerName[] = []) {
  const markers: SceneMarker[] = CORNER_ORDER.filter((n) => !omitCorners.includes(n)).map((n) => {
    const c = cornerPaperPoint(n);
    return { cx: c.x, cy: c.y, size: MAT.cornerMarkerSize, id: CORNER_IDS[n] };
  });
  const rects: { x: number; y: number; w: number; h: number; sticker: SceneMarker }[] = [];
  for (const card of cards) {
    const zc = rectCenter(zoneRect(card.zone));
    const x = zc.x - MAT.cardSize.w / 2 + (card.dx ?? 0);
    const y = zc.y - MAT.cardSize.h / 2 + (card.dy ?? 0);
    // Sticker in the card's bottom-right corner, like the printout recommends.
    const s = MAT.cardMarkerSize;
    const sticker = { cx: x + MAT.cardSize.w - 4 - s / 2, cy: y + MAT.cardSize.h - 4 - s / 2, size: s, id: idForCard(card.cardId), quarterTurns: card.quarterTurns };
    rects.push({ x, y, w: MAT.cardSize.w, h: MAT.cardSize.h, sticker });
  }
  const grids = new Map<SceneMarker, number[][]>();
  [...markers, ...rects.map((r) => r.sticker)].forEach((m) => grids.set(m, rotateGrid(markerGrid(m.id), m.quarterTurns)));

  const markerValue = (m: SceneMarker, p: Pt): number | null => {
    const half = m.size / 2;
    if (Math.abs(p.x - m.cx) > half || Math.abs(p.y - m.cy) > half) return null;
    const g = grids.get(m)!;
    const col = Math.min(6, Math.floor(((p.x - (m.cx - half)) / m.size) * 7));
    const row = Math.min(6, Math.floor(((p.y - (m.cy - half)) / m.size) * 7));
    return g[row][col] ? 250 : 10;
  };

  return (p: Pt): number => {
    if (p.x < 0 || p.y < 0 || p.x > MAT.paper.width || p.y > MAT.paper.height) return 70; // wooden table
    for (const m of markers) {
      const v = markerValue(m, p);
      if (v !== null) return v;
    }
    for (const r of rects) {
      const v = markerValue(r.sticker, p);
      if (v !== null) return v;
      const quiet = r.sticker.size / 2 + 3;
      if (Math.abs(p.x - r.sticker.cx) <= quiet && Math.abs(p.y - r.sticker.cy) <= quiet) return 250; // sticker margin
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 140; // card art
    }
    // Printed zone outlines (thin grey lines) - must not confuse the detector.
    for (const z of ['A', 'B', 'C', 'D'] as const) {
      const r = zoneRect(z);
      const onX = Math.abs(p.x - r.x) < 0.4 || Math.abs(p.x - (r.x + r.w)) < 0.4;
      const onY = Math.abs(p.y - r.y) < 0.4 || Math.abs(p.y - (r.y + r.h)) < 0.4;
      if ((onX && p.y >= r.y && p.y <= r.y + r.h) || (onY && p.x >= r.x && p.x <= r.x + r.w)) return 120;
    }
    return 245; // paper
  };
}

/** Render the scene as a camera image: paper corners land on `cam` (TL, TR, BR, BL). */
function renderCamera(scene: (p: Pt) => number, width: number, height: number, cam: Pt[]) {
  const paper = [{ x: 0, y: 0 }, { x: MAT.paper.width, y: 0 }, { x: MAT.paper.width, y: MAT.paper.height }, { x: 0, y: MAT.paper.height }];
  const camToPaper = homographyFromPoints(cam, paper)!;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = scene(applyHomography(camToPaper, { x: x + 0.5, y: y + 0.5 }));
      const o = (y * width + x) * 4;
      data[o] = v; data[o + 1] = v; data[o + 2] = v; data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

// A phone held at an angle: the far edge of the mat looks narrower and everything is rotated a bit.
const TILTED_LANDSCAPE: Pt[] = [{ x: 190, y: 150 }, { x: 800, y: 95 }, { x: 905, y: 610 }, { x: 70, y: 640 }];
// Portrait phone with the mat turned 90 degrees (long side along the long side of the screen).
const ROTATED_PORTRAIT: Pt[] = [{ x: 500, y: 90 }, { x: 470, y: 880 }, { x: 40, y: 860 }, { x: 70, y: 120 }];

const CARDS: SceneCard[] = [
  { zone: 'A', cardId: 'char_solara' },
  { zone: 'B', cardId: 'act_fire', quarterTurns: 1 },
  { zone: 'D', cardId: 'scen_desert', quarterTurns: 2, dx: -6, dy: 4 },
];

// ---------------------------------------------------------------- tests
describe('marker data', () => {
  const corners = Object.values(markersJson.corners);
  const cards = Object.keys(markersJson.cards).map(Number);

  test('every marker ID is unique, in range and rotation-safe (margin >= 5)', () => {
    const all = [...corners, ...cards];
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) {
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(1023);
      expect(rotationMargin(id)).toBeGreaterThanOrEqual(5);
    }
  });

  test('markers.json covers all 35 cards exactly once', () => {
    const mapped = Object.values(markersJson.cards).sort();
    expect(mapped).toEqual([...ALL_CARD_IDS].sort());
  });

  test('our bit patterns decode identically in js-aruco', () => {
    const det = arucoInternals();
    for (const id of [...corners, ...cards]) {
      const bits = markerDataBits(id);
      expect(codeDistance(bits)).toBe(0);
      expect(det.hammingDistance(bits)).toBe(0);
      expect(decodeBits(bits)).toBe(id);
      expect(det.mat2id(bits)).toBe(id);
      expect(rotateBits(bits)).toEqual(det.rotate(bits));
    }
  });
});

describe('homography + mat layout', () => {
  test('round-trips points through a perspective mapping', () => {
    const src = [{ x: 10, y: 20 }, { x: 300, y: 40 }, { x: 280, y: 260 }, { x: 30, y: 230 }];
    const dst = [{ x: 0, y: 0 }, { x: 297, y: 0 }, { x: 297, y: 210 }, { x: 0, y: 210 }];
    const h = homographyFromPoints(src, dst)!;
    const back = homographyFromPoints(dst, src)!;
    src.forEach((p, i) => {
      const q = applyHomography(h, p);
      expect(q.x).toBeCloseTo(dst[i].x, 6);
      expect(q.y).toBeCloseTo(dst[i].y, 6);
      const r = applyHomography(back, q);
      expect(r.x).toBeCloseTo(p.x, 6);
    });
  });

  test('zone lookup: inside, tolerance band and outside', () => {
    const a = zoneRect('A');
    expect(zoneAt(rectCenter(a))).toEqual({ zone: 'A', distance: 0 });
    expect(zoneAt({ x: a.x - 3, y: a.y + 10 })?.zone).toBe('A');
    expect(zoneAt({ x: 150, y: 5 })).toBeNull();
  });
});

describe('camera pipeline on synthetic frames', () => {
  test('tilted landscape view: every card lands in its zone', () => {
    const frame = renderCamera(buildScene(CARDS), 960, 720, TILTED_LANDSCAPE);
    const out = analyseFrame(frame, new GeometryTracker(), 0, 14);
    expect(out.calibration).toBe('ok');
    expect(out.cornersFound).toHaveLength(4);
    expect(out.readings.A.cardId).toBe('char_solara');
    expect(out.readings.B.cardId).toBe('act_fire');
    expect(out.readings.C.cardId).toBeNull();
    expect(out.readings.D.cardId).toBe('scen_desert');
    // The recovered paper position of the zone-A sticker is within a few mm of the truth.
    const truth = { x: rectCenter(zoneRect('A')).x + MAT.cardSize.w / 2 - 4 - MAT.cardMarkerSize / 2, y: rectCenter(zoneRect('A')).y + MAT.cardSize.h / 2 - 4 - MAT.cardMarkerSize / 2 };
    expect(Math.hypot(out.readings.A.paper!.x - truth.x, out.readings.A.paper!.y - truth.y)).toBeLessThan(4);
  });

  test('portrait phone with the mat rotated 90 degrees: same zones', () => {
    const frame = renderCamera(buildScene(CARDS), 540, 960, ROTATED_PORTRAIT);
    const out = analyseFrame(frame, new GeometryTracker(), 0, 14);
    expect(out.calibration).toBe('ok');
    expect(out.readings.A.cardId).toBe('char_solara');
    expect(out.readings.B.cardId).toBe('act_fire');
    expect(out.readings.D.cardId).toBe('scen_desert');
  });

  test('one corner covered by a hand: partial calibration still assigns zones', () => {
    const frame = renderCamera(buildScene(CARDS, ['topRight']), 960, 720, TILTED_LANDSCAPE);
    const out = analyseFrame(frame, new GeometryTracker(), 0, 14);
    expect(out.calibration).toBe('partial');
    expect(out.readings.A.cardId).toBe('char_solara');
    expect(out.readings.B.cardId).toBe('act_fire');
    expect(out.readings.D.cardId).toBe('scen_desert');
  });

  test('top-down warp straightens the mat', () => {
    const frame = renderCamera(buildScene(CARDS), 960, 720, TILTED_LANDSCAPE);
    const out = analyseFrame(frame, new GeometryTracker(), 0, 14);
    const top = warpTopDown(frame, out.paperToCamera!, MAT.paper, 1);
    const px = (p: Pt) => top.data[(Math.floor(p.y) * top.width + Math.floor(p.x)) * 4];
    const tl = cornerPaperPoint('topLeft');
    expect(px({ x: tl.x - MAT.cornerMarkerSize / 2 + 1, y: tl.y })).toBeLessThan(60); // black marker border
    expect(px(rectCenter(zoneRect('C')))).toBeGreaterThan(200); // empty zone = white paper
    expect(px(rectCenter(zoneRect('A')))).toBeGreaterThan(100); // card art (grey)
    expect(px(rectCenter(zoneRect('A')))).toBeLessThan(200);
  });
});

describe('geometry hold + debounce', () => {
  const cornerMarkers = CORNER_ORDER.map((n, i) => {
    const c = [{ x: 100, y: 100 }, { x: 800, y: 100 }, { x: 800, y: 600 }, { x: 100, y: 600 }][i];
    return { id: CORNER_IDS[n], center: c, corners: [c, c, c, c] as [Pt, Pt, Pt, Pt] };
  });

  test('a covered mat keeps the last geometry for geometryHoldMs, then drops it', () => {
    const tracker = new GeometryTracker(2000);
    expect(analyseMarkers(cornerMarkers, tracker, 0).calibration).toBe('ok');
    const held = analyseMarkers([], tracker, 1000);
    expect(held.calibration).toBe('held');
    expect(held.geometryAgeMs).toBe(1000);
    expect(analyseMarkers([], tracker, 2500).calibration).toBe('none');
  });

  test('a card must be seen for registerFrames frames before it counts', () => {
    const d = new ZoneDebouncer();
    d.configure(3, 2);
    const seen = { A: { cardId: 'char_solara' }, B: { cardId: null }, C: { cardId: null }, D: { cardId: null } };
    const empty = { A: { cardId: null }, B: { cardId: null }, C: { cardId: null }, D: { cardId: null } };
    expect(d.feed(seen)).toEqual([]);
    expect(d.feed(seen)).toEqual([]);
    expect(d.feed(seen)).toEqual([{ zone: 'A', cardId: 'char_solara' }]);
    expect(d.feed(empty)).toEqual([]); // one dropped frame is ignored
    expect(d.feed(seen)).toEqual([]);
    expect(d.progress().A.stable).toBe('char_solara');
  });
});
