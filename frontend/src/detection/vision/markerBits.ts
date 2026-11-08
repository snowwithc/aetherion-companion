/**
 * Marker bit patterns for the dictionary js-aruco decodes (original ArUco, 5x5 data bits,
 * IDs 0..1023). Shared by the PDF printout and the unit tests so a printed marker is
 * guaranteed to decode to the ID we think it is.
 *
 * Grid convention: 1 = white cell, 0 = black cell (js-aruco counts non-zero = white).
 */

/** Each data row is one of these 4 words; bits 1 and 3 carry two bits of the ID. */
const WORDS: number[][] = [
  [1, 0, 0, 0, 0],
  [1, 0, 1, 1, 1],
  [0, 1, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

export const MAX_MARKER_ID = 1023;

/** 5x5 data bits for an ID (row 0 carries the two most significant bits). */
export function markerDataBits(id: number): number[][] {
  if (!Number.isInteger(id) || id < 0 || id > MAX_MARKER_ID) throw new Error(`marker id out of range: ${id}`);
  const rows: number[][] = [];
  for (let r = 0; r < 5; r++) {
    const word = (id >> (8 - 2 * r)) & 3;
    rows.push([...WORDS[word]]);
  }
  return rows;
}

/** Full 7x7 grid: 1-cell black border around the 5x5 data. */
export function markerGrid(id: number): number[][] {
  const data = markerDataBits(id);
  const grid: number[][] = [];
  for (let r = 0; r < 7; r++) {
    const row: number[] = [];
    for (let c = 0; c < 7; c++) {
      const border = r === 0 || r === 6 || c === 0 || c === 6;
      row.push(border ? 0 : data[r - 1][c - 1]);
    }
    grid.push(row);
  }
  return grid;
}

/** Same rotation as js-aruco's AR.Detector.prototype.rotate. */
export function rotateBits(src: number[][]): number[][] {
  const n = src.length;
  const dst: number[][] = [];
  for (let i = 0; i < n; i++) {
    dst[i] = [];
    for (let j = 0; j < src[i].length; j++) dst[i][j] = src[src[i].length - j - 1][i];
  }
  return dst;
}

/** Distance from a 5x5 bit matrix to the nearest valid code (0 = it decodes). */
export function codeDistance(bits: number[][]): number {
  let dist = 0;
  for (let i = 0; i < 5; i++) {
    let best = Infinity;
    for (const w of WORDS) {
      let s = 0;
      for (let k = 0; k < 5; k++) if (bits[i][k] !== w[k]) s++;
      if (s < best) best = s;
    }
    dist += best;
  }
  return dist;
}

export function decodeBits(bits: number[][]): number {
  let id = 0;
  for (let i = 0; i < 5; i++) {
    id = (id << 1) | bits[i][1];
    id = (id << 1) | bits[i][3];
  }
  return id;
}

/**
 * How many bit errors it would take for a rotated view of this marker to decode as some
 * valid code. Higher = safer. IDs in markers.json must have a margin of at least 5.
 */
export function rotationMargin(id: number): number {
  let bits = markerDataBits(id);
  let margin = Infinity;
  for (let r = 0; r < 3; r++) {
    bits = rotateBits(bits);
    margin = Math.min(margin, codeDistance(bits));
  }
  return margin;
}
