/** @jest-environment node */
import fs from 'fs';
import { detectMarkers } from '@/detection/vision/aruco';
import { analyseFrame, GeometryTracker } from '@/detection/vision/pipeline';
import { applyHomography, homographyFromPoints } from '@/detection/vision/homography';
import markersJson from '@/data/markers.json';
const meta = JSON.parse(fs.readFileSync('/tmp/aeth/meta.json', 'utf8'));
function load(i: number) {
  const rgb = fs.readFileSync(`/tmp/aeth/page${i}.rgb`); const { w, h } = meta[i - 1];
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0, q = 0; p < w * h; p++, q += 3) { data[p*4] = rgb[q]; data[p*4+1] = rgb[q+1]; data[p*4+2] = rgb[q+2]; data[p*4+3] = 255; }
  return { width: w, height: h, data };
}
/** Photograph the printed page with a tilted phone: page corners -> cam quad, bilinear-ish sampling + light noise. */
function photograph(page: ReturnType<typeof load>, W: number, H: number, cam: {x:number;y:number}[]) {
  const pc = [{x:0,y:0},{x:page.width,y:0},{x:page.width,y:page.height},{x:0,y:page.height}];
  const toPage = homographyFromPoints(cam, pc)!; const out = new Uint8ClampedArray(W*H*4);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = applyHomography(toPage, { x: x + 0.5, y: y + 0.5 }); const o = (y*W+x)*4;
    const sx = Math.floor(p.x), sy = Math.floor(p.y);
    let v = 70;
    if (sx >= 0 && sy >= 0 && sx < page.width && sy < page.height) v = page.data[(sy*page.width+sx)*4] * 0.85 + 20; // dimmer paper
    v = Math.max(0, Math.min(255, v + (rnd() - 0.5) * 24));
    out[o] = v; out[o+1] = v; out[o+2] = v; out[o+3] = 255;
  }
  return { width: W, height: H, data: out };
}
test('printed mat: all 4 corners decode (flat + tilted photo)', () => {
  const page = load(1);
  const flat = analyseFrame(page, new GeometryTracker(), 0, 14);
  console.log('flat ids', flat.markers.map((m) => m.id), flat.calibration);
  expect(flat.calibration).toBe('ok');
  const photo = photograph(page, 960, 720, [{x:170,y:140},{x:820,y:90},{x:910,y:620},{x:60,y:650}]);
  const tilted = analyseFrame(photo, new GeometryTracker(), 0, 14);
  console.log('tilted ids', tilted.markers.map((m) => m.id), tilted.calibration);
  expect(tilted.calibration).toBe('ok');
});
test('printed sticker sheet: all 35 stickers decode to their IDs', () => {
  const page = load(2);
  const ids = new Set(detectMarkers(page, 14).map((m) => m.id));
  const expected = Object.keys(markersJson.cards).map(Number);
  const missing = expected.filter((i) => !ids.has(i));
  const extra = [...ids].filter((i) => !expected.includes(i));
  console.log('found', ids.size, 'missing', missing, 'extra', extra);
  expect(missing).toEqual([]); expect(extra).toEqual([]);
  // A lower-resolution phone photo of the sheet (~2.2 px/mm, 20 mm stickers -> ~44 px).
  const photo = photograph(page, 540, 760, [{x:40,y:30},{x:505,y:50},{x:520,y:740},{x:20,y:720}]);
  const ids2 = new Set(detectMarkers(photo, 14).map((m) => m.id));
  console.log('photo found', ids2.size, 'missing', expected.filter((i) => !ids2.has(i)));
});
