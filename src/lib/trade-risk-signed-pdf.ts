import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import type { TradeRiskDocument } from '@/lib/trade-risk-documents';
import { loadTradeRiskPdf } from '@/lib/trade-risk-documents';
import type { PublicTradeRiskAssignment } from '@/types/safety-trade-risk';

const DECLARATION_TEXT =
  'הנני מאשר כי קיבלתי וקראתי את תמצית המידע על סיכונים תעסוקתיים וכי ההנחיות ברורות לי ואני מתחייב לעבוד על פיהן.';

export async function buildSignedTradeRiskPdfFile(options: {
  assignment: PublicTradeRiskAssignment;
  document: TradeRiskDocument;
  sheetElement: HTMLElement;
}): Promise<File> {
  const original = await loadTradeRiskPdf(options.document);
  const originalBytes = await original.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalBytes);

  const canvas = await html2canvas(options.sheetElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const png = canvas.toDataURL('image/png');
  const image = await pdfDoc.embedPng(png);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const margin = 36;
  const maxWidth = page.getWidth() - margin * 2;
  const maxHeight = page.getHeight() - margin * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: (page.getWidth() - width) / 2,
    y: page.getHeight() - margin - height,
    width,
    height,
  });

  const bytes = await pdfDoc.save();
  const fileName = [
    'תמצית-סיכונים-חתומה',
    options.assignment.tradeLabel,
    options.assignment.signerName || options.assignment.employeeName,
  ]
    .join('-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .concat('.pdf');

  return new File([bytes], fileName, { type: 'application/pdf' });
}

export function downloadPdfFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function sharePdfFile(file: File, title: string, text: string): Promise<'shared' | 'downloaded'> {
  const data: ShareData = { title, text, files: [file] };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    await navigator.share(data);
    return 'shared';
  }
  downloadPdfFile(file);
  return 'downloaded';
}

export { DECLARATION_TEXT };
