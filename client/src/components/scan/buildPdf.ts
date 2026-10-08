import { PDFDocument } from 'pdf-lib';
import { format } from 'date-fns/format';
import { canvasToJpeg, renderPage, type ScanPage } from './imageProcessing';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 24;

/** Build an A4 PDF (one image per page, fitted with margins) from scanned pages. */
export async function buildPdf(pages: ScanPage[]): Promise<File> {
  const pdf = await PDFDocument.create();
  for (const page of pages) {
    const jpeg = await pdf.embedJpg(await canvasToJpeg(renderPage(page, 'full')));
    const pdfPage = pdf.addPage([A4_W, A4_H]);
    const scale = Math.min((A4_W - 2 * MARGIN) / jpeg.width, (A4_H - 2 * MARGIN) / jpeg.height);
    const w = jpeg.width * scale;
    const h = jpeg.height * scale;
    pdfPage.drawImage(jpeg, { x: (A4_W - w) / 2, y: (A4_H - h) / 2, width: w, height: h });
  }
  const bytes = await pdf.save();
  return new File([new Uint8Array(bytes)], `sken-${format(new Date(), 'yyyy-MM-dd')}.pdf`, {
    type: 'application/pdf',
  });
}
