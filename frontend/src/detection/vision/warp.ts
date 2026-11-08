/**
 * Top-down warp: re-sample the camera frame into paper space (as if the phone were held
 * perfectly flat above the mat). Used for the debug view and per-zone crops.
 * Nearest-neighbour sampling keeps it cheap enough to run on a phone.
 */
import { applyHomography, type Mat3 } from './homography';
import type { Rect } from './matLayout';

export interface RGBAImage { width: number; height: number; data: Uint8ClampedArray }

export function warpTopDown(
  src: RGBAImage,
  paperToCamera: Mat3,
  paper: { width: number; height: number },
  pxPerMm: number,
): RGBAImage {
  const width = Math.max(1, Math.round(paper.width * pxPerMm));
  const height = Math.max(1, Math.round(paper.height * pxPerMm));
  const out = new Uint8ClampedArray(width * height * 4);
  const sw = src.width;
  const sh = src.height;
  const sd = src.data;
  for (let y = 0; y < height; y++) {
    const py = (y + 0.5) / pxPerMm;
    for (let x = 0; x < width; x++) {
      const p = applyHomography(paperToCamera, { x: (x + 0.5) / pxPerMm, y: py });
      const o = (y * width + x) * 4;
      const sx = Math.floor(p.x);
      const sy = Math.floor(p.y);
      if (sx >= 0 && sy >= 0 && sx < sw && sy < sh && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        const i = (sy * sw + sx) * 4;
        out[o] = sd[i];
        out[o + 1] = sd[i + 1];
        out[o + 2] = sd[i + 2];
      } else {
        out[o] = 24;
        out[o + 1] = 28;
        out[o + 2] = 40;
      }
      out[o + 3] = 255;
    }
  }
  return { width, height, data: out };
}

/** Crop a paper-space rectangle (mm) out of a top-down image. */
export function cropPaperRect(top: RGBAImage, rect: Rect, pxPerMm: number): RGBAImage {
  const x0 = Math.max(0, Math.floor(rect.x * pxPerMm));
  const y0 = Math.max(0, Math.floor(rect.y * pxPerMm));
  const x1 = Math.min(top.width, Math.ceil((rect.x + rect.w) * pxPerMm));
  const y1 = Math.min(top.height, Math.ceil((rect.y + rect.h) * pxPerMm));
  const width = Math.max(1, x1 - x0);
  const height = Math.max(1, y1 - y0);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcStart = ((y0 + y) * top.width + x0) * 4;
    out.set(top.data.subarray(srcStart, srcStart + width * 4), y * width * 4);
  }
  return { width, height, data: out };
}
