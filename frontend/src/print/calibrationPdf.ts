/**
 * Printable calibration kit (A4), generated in the browser from the same data the camera uses:
 *  - page 1 (A4 landscape): the table mat - 4 corner markers + zones A-D (config.json -> mat)
 *  - page 2 (A4 portrait):  35 card stickers, one marker per card (markers.json)
 * Markers are drawn as vector squares so they stay razor-sharp at any printer resolution.
 */
import type { jsPDF as JsPDFType } from 'jspdf';
import { cardName, cardTypeOf, type CardType, type ZoneId } from '@/engine';
import { markerGrid } from '@/detection/vision/markerBits';
import { CARD_MARKERS, CORNER_IDS, CORNER_ORDER, MAT, MAT_ZONES, cornerPaperPoint, rectCenter, zoneRect, type CornerName } from '@/detection/vision/matLayout';

type JsPDFCtor = new (options: { orientation: 'landscape' | 'portrait'; unit: 'mm'; format: 'a4' }) => JsPDFType;

const TYPE_ID: Record<CardType, string> = { character: 'Karakter', activation: 'Aktivasi', booster: 'Booster', scenario: 'Skenario' };
const ZONE_LABEL: Record<ZoneId, { title: string; sub: string }> = {
  A: { title: 'KARAKTER', sub: 'kartu karaktermu' },
  B: { title: 'AKTIVASI', sub: 'dari Tumpukan E' },
  C: { title: 'BOOSTER', sub: 'dari Tumpukan F' },
  D: { title: 'SKENARIO', sub: 'dari Tumpukan G' },
};
const CORNER_LABEL: Record<CornerName, string> = { topLeft: 'kiri atas', topRight: 'kanan atas', bottomRight: 'kanan bawah', bottomLeft: 'kiri bawah' };

/** Black square, then white runs on top (no hairline seams inside the black border). */
export function drawMarker(doc: JsPDFType, id: number, x: number, y: number, size: number) {
  const grid = markerGrid(id);
  const cell = size / 7;
  // White runs overlap the next row by a hair so stacked cells never show a seam line.
  const seam = Math.min(0.05, cell * 0.02);
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, size, size, 'F');
  doc.setFillColor(255, 255, 255);
  for (let r = 0; r < 7; r++) {
    let c = 0;
    while (c < 7) {
      if (!grid[r][c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < 7 && grid[r][c]) c++;
      const below = r < 6 && grid[r + 1].slice(start, c).some(Boolean) ? seam : 0;
      doc.rect(x + start * cell, y + r * cell, (c - start) * cell, cell + below, 'F');
    }
  }
}

function matPage(doc: JsPDFType) {
  const P = MAT.paper;
  const half = MAT.cornerMarkerSize / 2;

  doc.setTextColor(20, 24, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AETHERION - Lembar Kalibrasi Meja', 10, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Letakkan lembar ini datar di meja. Arahkan kamera HP dari atas sampai keempat marker sudut terlihat.', 10, 18);

  // Corner markers + small labels (kept 4 mm away so the white quiet zone stays clean).
  for (const n of CORNER_ORDER) {
    const c = cornerPaperPoint(n);
    drawMarker(doc, CORNER_IDS[n], c.x - half, c.y - half, MAT.cornerMarkerSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(90, 96, 115);
    const left = n === 'topLeft' || n === 'bottomLeft';
    const tx = left ? c.x + half + 4 : c.x - half - 4;
    doc.text(`SUDUT ${CORNER_IDS[n]}`, tx, c.y - 1, { align: left ? 'left' : 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(CORNER_LABEL[n], tx, c.y + 2.5, { align: left ? 'left' : 'right' });
  }

  // Header between the top corner markers.
  doc.setTextColor(20, 24, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ZONA PERMAINAN', P.width / 2, 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 76, 95);
  doc.text('Kartu menghadap ke atas, stiker marker di pojok depan kartu.', P.width / 2, 41.5, { align: 'center' });
  doc.text('Tumpukan E (Aktivasi), F (Booster) dan G (Skenario) diletakkan di luar lembar.', P.width / 2, 46, { align: 'center' });

  // Zones A-D with a dashed card outline inside.
  for (const z of MAT_ZONES) {
    const r = zoneRect(z);
    const c = rectCenter(r);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(150, 155, 170);
    doc.setLineWidth(0.4);
    doc.roundedRect(r.x, r.y, r.w, r.h, 2, 2, 'S');
    doc.setDrawColor(205, 208, 218);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 1.6], 0);
    doc.rect(c.x - MAT.cardSize.w / 2, c.y - MAT.cardSize.h / 2, MAT.cardSize.w, MAT.cardSize.h, 'S');
    doc.setLineDashPattern([], 0);
    doc.setTextColor(214, 217, 226);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(44);
    doc.text(z, c.x, c.y + 2, { align: 'center' });
    doc.setTextColor(110, 116, 135);
    doc.setFontSize(9);
    doc.text(ZONE_LABEL[z].title, c.x, c.y + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(ZONE_LABEL[z].sub, c.x, c.y + 19, { align: 'center' });
  }

  // Footer: printing tips + a 100 mm check bar.
  doc.setTextColor(70, 76, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('1. Cetak di A4 mendatar, skala 100% (Actual size). 2. Kertas tidak mengkilap, jangan dilipat di area marker. 3. Cahaya terang merata, hindari bayangan HP menutupi marker.', 10, 192);
  doc.text('Lembar boleh diputar ke arah mana saja - kamera mengenali arahnya dari nomor sudut.', 10, 196);
  doc.setDrawColor(20, 24, 40);
  doc.setLineWidth(0.4);
  doc.line(10, 202, 110, 202);
  doc.line(10, 200.5, 10, 203.5);
  doc.line(110, 200.5, 110, 203.5);
  doc.setFontSize(6.5);
  doc.text('Garis ini harus 100 mm. Kalau berbeda, deteksi tetap jalan, tetapi kartu bisa sedikit melewati zona.', 113, 203);
  doc.setTextColor(150, 155, 170);
  doc.text('Aetherion Companion - tata letak dari config.json (mat)', P.width - 10, 207, { align: 'right' });
}

function stickerPage(doc: JsPDFType) {
  const pageW = 210;
  const cols = 6;
  const cellW = 32;
  const cellH = 38;
  const x0 = (pageW - cols * cellW) / 2;
  const y0 = 32;
  const m = MAT.cardMarkerSize;

  doc.setTextColor(20, 24, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AETHERION - Stiker Marker Kartu', 10, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 76, 95);
  doc.text('Gunting tiap stiker di garis putus-putus, lalu tempel di pojok kanan bawah sisi DEPAN kartu yang namanya sama.', 10, 18);
  doc.text('Kartu dimainkan menghadap ke atas, jadi stiker harus terlihat kamera. Jangan tutupi atau potong bingkai hitam marker.', 10, 22.5);
  doc.text(`Ukuran marker ${m} mm - cetak skala 100%. Lebih besar boleh, lebih kecil membuat deteksi lebih sulit.`, 10, 27);

  const entries = Object.entries(CARD_MARKERS)
    .map(([id, cardId]) => ({ id: Number(id), cardId }))
    .sort((a, b) => a.id - b.id);

  entries.forEach((e, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x0 + col * cellW;
    const cy = y0 + row * cellH;
    doc.setDrawColor(190, 194, 205);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.rect(cx + 1, cy + 1, cellW - 2, cellH - 2, 'S');
    doc.setLineDashPattern([], 0);
    drawMarker(doc, e.id, cx + (cellW - m) / 2, cy + 4, m);
    const type = cardTypeOf(e.cardId);
    doc.setTextColor(20, 24, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(cardName(e.cardId), cx + cellW / 2, cy + 4 + m + 4.5, { align: 'center', maxWidth: cellW - 4 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(110, 116, 135);
    doc.text(`${type ? TYPE_ID[type] : ''} - ID ${e.id}`, cx + cellW / 2, cy + 4 + m + 8.5, { align: 'center' });
  });
}

/** Builds the 2-page kit. Pass the jsPDF constructor (lets tests use it without lazy loading). */
export function buildCalibrationPdf(JsPDF: JsPDFCtor): JsPDFType {
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Aetherion - Lembar Kalibrasi & Stiker', creator: 'Aetherion Companion' });
  matPage(doc);
  doc.addPage('a4', 'portrait');
  stickerPage(doc);
  return doc;
}

export const CALIBRATION_PDF_NAME = 'aetherion-kalibrasi-dan-stiker.pdf';

/** Lazy-loads jsPDF (keeps it out of the first paint) and downloads the kit. */
export async function downloadCalibrationPdf(): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = buildCalibrationPdf(jsPDF as unknown as JsPDFCtor);
  doc.save(CALIBRATION_PDF_NAME);
}
