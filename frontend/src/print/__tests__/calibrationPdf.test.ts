/**
 * @jest-environment node
 *
 * Printable kit tests. Run with: cd frontend && CI=true yarn test --watchAll=false src/print
 * Set AETH_PDF_OUT=/path/file.pdf to also write the generated PDF (used for raster checks).
 */
import fs from 'fs';
import { jsPDF } from 'jspdf';
import { buildCalibrationPdf } from '../calibrationPdf';

type Ctor = Parameters<typeof buildCalibrationPdf>[0];

test('builds a 2-page A4 kit: landscape mat + portrait sticker sheet', () => {
  const doc = buildCalibrationPdf(jsPDF as unknown as Ctor);
  expect(doc.getNumberOfPages()).toBe(2);

  doc.setPage(1);
  expect(Math.round(doc.internal.pageSize.getWidth())).toBe(297);
  expect(Math.round(doc.internal.pageSize.getHeight())).toBe(210);
  doc.setPage(2);
  expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
  expect(Math.round(doc.internal.pageSize.getHeight())).toBe(297);

  const bytes = doc.output('arraybuffer');
  expect(bytes.byteLength).toBeGreaterThan(5000);
  if (process.env.AETH_PDF_OUT) fs.writeFileSync(process.env.AETH_PDF_OUT, Buffer.from(bytes));
});
