import { PDFDocument, rgb } from 'pdf-lib';
import type { ConstructionInductionDocument } from '@/lib/construction-induction-documents';
import { loadConstructionInductionPdf } from '@/lib/construction-induction-documents';
import type { ConstructionInductionLanguage } from '@/types/safety-training';
import type { PublicInductionAssignment } from '@/types/safety-induction';

export const INDUCTION_DECLARATION_POINTS = [
  'הובאו בפני כל הסיכונים הכרוכים בעבודתי באתר וכי הבנתי את כל הנושאים שהודרכתי עליהם ועל פי תמצית המידע בכתב לעובד חדש, אני מתחייב בזאת לפעול על פי כל הנחיות ודרישות הבטיחות שאני נדרש להם.',
  'אני מתחייב להשתמש בציוד המגן האישי הנדרש שסופק לי ולדאוג להחליפו משנתגלה בו פגם.',
] as const;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InductionStampLayout {
  page1: {
    companyName: Rect;
    heightValidUntil: Rect;
    employeeName: Rect;
    /** Centers of the 9 ID digit boxes (page 1). */
    employeeIdDigitCenters: readonly number[];
    employeeIdY: number;
    employeeIdHeight: number;
    jobTitle: Rect;
    instructorName: Rect;
    siteManagerName: Rect;
    instructorSignature: Rect;
  };
  page2: {
    employeeName: Rect;
    /** Centers of the 9 ID digit boxes (acknowledgment table). */
    employeeIdDigitCenters: readonly number[];
    employeeIdY: number;
    employeeIdHeight: number;
    signature: Rect;
  };
}

/**
 * Coordinates measured from table borders on the Hebrew A4 template
 * (pdf-lib origin = bottom-left). Value cells sit to the LEFT of RTL labels.
 */
const HEBREW_LAYOUT: InductionStampLayout = {
  page1: {
    // Underline after "באתרי חברת" (right edge must stay left of חברת ~x208)
    companyName: { x: 70, y: 735, width: 115, height: 13 },
    // Date cell printed as "__/__/____" — covered with white before stamp
    heightValidUntil: { x: 300, y: 698, width: 90, height: 15 },
    // Right table value column (x≈292–443), left of label column
    employeeName: { x: 298, y: 678, width: 140, height: 14 },
    employeeIdDigitCenters: [314.64, 329.76, 344.88, 360.0, 375.36, 390.48, 405.6, 420.96, 436.32],
    employeeIdY: 659,
    employeeIdHeight: 14,
    jobTitle: { x: 298, y: 634, width: 140, height: 14 },
    // Left table value column (x≈36–135), left of label column
    instructorName: { x: 42, y: 678, width: 88, height: 14 },
    siteManagerName: { x: 42, y: 659, width: 88, height: 14 },
    instructorSignature: { x: 42, y: 628, width: 88, height: 28 },
  },
  page2: {
    // Acknowledgment value column (x≈336–474), left of "שם העובד" / "תעודת זהות"
    employeeName: { x: 345, y: 72, width: 118, height: 14 },
    employeeIdDigitCenters: [342.7, 356.4, 370.1, 383.8, 397.7, 411.6, 425.5, 439.4, 453.1],
    employeeIdY: 53,
    employeeIdHeight: 14,
    signature: { x: 42, y: 50, width: 115, height: 44 },
  },
};

const LANGUAGE_LAYOUT: Partial<Record<ConstructionInductionLanguage, InductionStampLayout>> = {
  he: HEBREW_LAYOUT,
  ar: HEBREW_LAYOUT,
};

function layoutFor(language: ConstructionInductionLanguage): InductionStampLayout {
  return LANGUAGE_LAYOUT[language] ?? HEBREW_LAYOUT;
}

function requireBrowserCanvas(): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('יצירת PDF חתום זמינה בדפדפן בלבד');
  }
  return document.createElement('canvas');
}

function formatDisplayDate(iso?: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Same text rasterizer used for trade-risk (no backdrop / no canvas direction hacks). */
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
  const pad = options.widthPt > 20 ? 3 : 0.5;
  const x = align === 'right' ? options.widthPt - pad : align === 'left' ? pad : options.widthPt / 2;
  // Avoid tiny maxWidth on digit boxes — it skews glyph centering.
  if (options.widthPt > 20) {
    ctx.fillText(options.text, x, options.heightPt / 2, options.widthPt - pad * 2);
  } else {
    ctx.fillText(options.text, x, options.heightPt / 2);
  }
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

function coverPrintedPlaceholder(
  page: ReturnType<PDFDocument['getPages']>[number],
  box: Rect,
): void {
  // Hide template underscores / date masks so stamped values read cleanly.
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
}

async function stampText(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['getPages']>[number],
  text: string | undefined,
  box: Rect,
  align: 'left' | 'right' | 'center',
  fontSize: number,
  options?: { cover?: boolean; coverBox?: Rect },
): Promise<void> {
  const value = (text || '').trim();
  if (!value) return;
  if (options?.cover || options?.coverBox) {
    coverPrintedPlaceholder(page, options.coverBox ?? box);
  }
  const png = await textToPng({
    text: value,
    widthPt: box.width,
    heightPt: box.height,
    fontSize,
    align,
  });
  page.drawImage(await pdfDoc.embedPng(png), box);
}

async function stampIdDigits(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['getPages']>[number],
  idNumber: string | undefined,
  centers: readonly number[],
  y: number,
  height: number,
): Promise<void> {
  const digits = (idNumber || '').replace(/\D/g, '').slice(0, centers.length);
  if (!digits) return;
  for (let i = 0; i < digits.length; i += 1) {
    await stampText(
      pdfDoc,
      page,
      digits[i],
      { x: centers[i] - 5.5, y, width: 11, height },
      'center',
      10,
    );
  }
}

async function stampSignature(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['getPages']>[number],
  signatureDataUrl: string | undefined,
  box: Rect,
): Promise<void> {
  if (!signatureDataUrl) return;
  const bytes = await dataUrlToBytes(signatureDataUrl);
  const image = signatureDataUrl.includes('image/jpeg')
    ? await pdfDoc.embedJpg(bytes)
    : await pdfDoc.embedPng(bytes);
  const pad = 2;
  const maxW = box.width - pad * 2;
  const maxH = box.height - pad * 2;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  });
}

export async function buildSignedInductionPdfFile(options: {
  assignment: PublicInductionAssignment;
  document: ConstructionInductionDocument;
  /** @deprecated kept for call-site compatibility; no longer used */
  sheetElement?: HTMLElement | null;
}): Promise<File> {
  const original = await loadConstructionInductionPdf(options.document);
  const pdfDoc = await PDFDocument.load(await original.arrayBuffer());
  const pages = pdfDoc.getPages();
  if (pages.length === 0) throw new Error('מסמך ה־PDF ריק');

  const layout = layoutFor(options.document.code);
  const page1 = pages[0];
  const pageLast = pages[pages.length - 1];

  const signerName = (options.assignment.signerName || options.assignment.employeeName || '').trim();
  const signerId = (options.assignment.signerIdNumber || options.assignment.employeeIdNumber || '').trim();
  const jobTitle = (options.assignment.jobTitle || options.assignment.employeeJobTitle || '').trim();
  const companyName = (options.assignment.companyName || options.assignment.clientName || '').trim();
  const instructorName = (options.assignment.instructorName || '').trim();
  const siteManagerName = (options.assignment.siteManagerName || '').trim();
  const heightDate = formatDisplayDate(options.assignment.heightTrainingValidUntil);
  const signatureDataUrl = options.assignment.signatureDataUrl;

  // Page 1 — header tables
  await stampText(pdfDoc, page1, companyName, layout.page1.companyName, 'right', 10, {
    coverBox: { x: 63, y: 732, width: 142, height: 18 },
  });
  await stampText(pdfDoc, page1, heightDate, layout.page1.heightValidUntil, 'center', 9, { cover: true });
  await stampText(pdfDoc, page1, signerName, layout.page1.employeeName, 'right', 10);
  await stampIdDigits(
    pdfDoc,
    page1,
    signerId,
    layout.page1.employeeIdDigitCenters,
    layout.page1.employeeIdY,
    layout.page1.employeeIdHeight,
  );
  await stampText(pdfDoc, page1, jobTitle, layout.page1.jobTitle, 'right', 10);
  await stampText(pdfDoc, page1, instructorName, layout.page1.instructorName, 'right', 10);
  await stampText(pdfDoc, page1, siteManagerName, layout.page1.siteManagerName, 'right', 10);
  await stampSignature(pdfDoc, page1, signatureDataUrl, layout.page1.instructorSignature);

  // Last page — acknowledgment table
  await stampText(pdfDoc, pageLast, signerName, layout.page2.employeeName, 'right', 10);
  await stampIdDigits(
    pdfDoc,
    pageLast,
    signerId,
    layout.page2.employeeIdDigitCenters,
    layout.page2.employeeIdY,
    layout.page2.employeeIdHeight,
  );
  await stampSignature(pdfDoc, pageLast, signatureDataUrl, layout.page2.signature);

  const pdfBytes = await pdfDoc.save();
  const fileName = [
    'הוראות-בטיחות-עובד-חדש-חתום',
    signerName || options.assignment.employeeName,
    options.document.code,
  ]
    .join('-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .concat('.pdf');

  return new File([pdfBytes], fileName, { type: 'application/pdf' });
}
