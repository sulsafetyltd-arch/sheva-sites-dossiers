import { PDFDocument } from 'pdf-lib';
import type { TradeRiskDocument } from '@/lib/trade-risk-documents';
import { loadTradeRiskPdf } from '@/lib/trade-risk-documents';
import type { PublicTradeRiskAssignment } from '@/types/safety-trade-risk';

const DECLARATION_TEXT =
  'הנני מאשר כי קיבלתי וקראתי את תמצית המידע על סיכונים תעסוקתיים וכי ההנחיות ברורות לי ואני מתחייב לעבוד על פיהן.';

/** PDF-point rectangles on the declaration table (A4, origin bottom-left). */
const HE_FORM_SLOTS = {
  // RTL table: [id/date/instructor values | their labels | name/sig/contractor values | their labels]
  name: { x: 290, y: 105, width: 128, height: 15 },
  idNumber: { x: 38, y: 105, width: 85, height: 15 },
  signature: { x: 290, y: 85, width: 128, height: 16 },
  date: { x: 38, y: 85, width: 85, height: 14 },
  contractor: { x: 290, y: 69, width: 128, height: 12 },
  instructor: { x: 38, y: 69, width: 85, height: 12 },
} as const;

function requireBrowserCanvas(): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('יצירת PDF חתום זמינה בדפדפן בלבד');
  }
  return document.createElement('canvas');
}

async function textToPng(options: {
  text: string;
  widthPt: number;
  heightPt: number;
  fontSize: number;
  align?: 'left' | 'right' | 'center';
}): Promise<Uint8Array> {
  const scale = 3;
  const canvas = requireBrowserCanvas();
  canvas.width = Math.max(1, Math.ceil(options.widthPt * scale));
  canvas.height = Math.max(1, Math.ceil(options.heightPt * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, options.widthPt, options.heightPt);
  ctx.fillStyle = '#111111';
  ctx.font = `600 ${options.fontSize}px Heebo, Arial, sans-serif`;
  const align = options.align ?? 'right';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const x = align === 'right' ? options.widthPt - 3 : align === 'left' ? 3 : options.widthPt / 2;
  ctx.fillText(options.text, x, options.heightPt / 2, options.widthPt - 6);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('PNG encode failed'))), 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('קריאת החתימה נכשלה');
  return new Uint8Array(await response.arrayBuffer());
}

export async function buildSignedTradeRiskPdfFile(options: {
  assignment: PublicTradeRiskAssignment;
  document: TradeRiskDocument;
  /** @deprecated kept for call-site compatibility; no longer used */
  sheetElement?: HTMLElement | null;
}): Promise<File> {
  const original = await loadTradeRiskPdf(options.document);
  const pdfDoc = await PDFDocument.load(await original.arrayBuffer());
  const pages = pdfDoc.getPages();
  if (pages.length === 0) throw new Error('מסמך ה־PDF ריק');
  const page = pages[pages.length - 1];
  const slots = HE_FORM_SLOTS;

  const signerName = (options.assignment.signerName || options.assignment.employeeName || '').trim();
  const signerId = (options.assignment.signerIdNumber || '').trim();
  const declarationDate = (options.assignment.declarationDate || '').trim();
  const contractor = (options.assignment.contractorName || options.assignment.clientName || '').trim();
  const instructor = (options.assignment.instructorName || '').trim();
  const signatureDataUrl = options.assignment.signatureDataUrl;

  const drawText = async (
    text: string,
    box: { x: number; y: number; width: number; height: number },
    fontSize: number,
  ) => {
    if (!text) return;
    const png = await textToPng({
      text,
      widthPt: box.width,
      heightPt: box.height,
      fontSize,
      align: 'right',
    });
    page.drawImage(await pdfDoc.embedPng(png), box);
  };

  await drawText(signerName, slots.name, 9);
  await drawText(signerId, slots.idNumber, 9);
  await drawText(declarationDate, slots.date, 8);
  await drawText(contractor, slots.contractor, 8);
  await drawText(instructor, slots.instructor, 8);

  if (signatureDataUrl) {
    const bytes = await dataUrlToBytes(signatureDataUrl);
    const image = signatureDataUrl.includes('image/jpeg')
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);
    const pad = 2;
    const maxW = slots.signature.width - pad * 2;
    const maxH = slots.signature.height - pad * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: slots.signature.x + (slots.signature.width - width) / 2,
      y: slots.signature.y + (slots.signature.height - height) / 2,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const fileName = [
    'תמצית-סיכונים-חתומה',
    options.assignment.tradeLabel,
    signerName || options.assignment.employeeName,
  ]
    .join('-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .concat('.pdf');

  return new File([pdfBytes], fileName, { type: 'application/pdf' });
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
