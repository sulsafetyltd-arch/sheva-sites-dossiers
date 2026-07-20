import { PDFDocument } from 'pdf-lib';
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
  /** Page 1 — title company blank + header tables */
  page1: {
    companyName: Rect;
    heightValidUntil: Rect;
    employeeName: Rect;
    employeeId: Rect;
    jobTitle: Rect;
    instructorName: Rect;
    siteManagerName: Rect;
    instructorSignature: Rect;
  };
  /** Page 2 (last) — bottom acknowledgment table */
  page2: {
    employeeName: Rect;
    employeeId: Rect;
    signature: Rect;
  };
  align: 'right' | 'left';
}

/**
 * Coordinates measured against the Sol Safety Hebrew induction template (A4).
 * Other languages share the same table geometry with small vertical drift; we
 * reuse Hebrew slots unless a language-specific override is added.
 */
const HEBREW_LAYOUT: InductionStampLayout = {
  page1: {
    // Blank after "באתרי חברת ____" (left side of the RTL title line)
    companyName: { x: 95, y: 742, width: 130, height: 12 },
    // Date placeholder in "תוקף הדרכה לעבודה בגובה"
    heightValidUntil: { x: 318, y: 708, width: 82, height: 11 },
    // Right table value cells (left of the Hebrew labels)
    employeeName: { x: 318, y: 684, width: 155, height: 14 },
    employeeId: { x: 348, y: 656, width: 138, height: 18 },
    jobTitle: { x: 318, y: 630, width: 155, height: 14 },
    // Left table value cells
    instructorName: { x: 72, y: 684, width: 135, height: 14 },
    siteManagerName: { x: 72, y: 656, width: 135, height: 14 },
    instructorSignature: { x: 78, y: 612, width: 155, height: 40 },
  },
  page2: {
    // Keep clear of the RTL labels on the right of each row
    employeeName: { x: 255, y: 74, width: 175, height: 15 },
    employeeId: { x: 335, y: 56, width: 120, height: 14 },
    signature: { x: 46, y: 58, width: 108, height: 48 },
  },
  align: 'right',
};

const LANGUAGE_LAYOUT: Partial<Record<ConstructionInductionLanguage, InductionStampLayout>> = {
  he: HEBREW_LAYOUT,
  // Arabic template mirrors the Hebrew table geometry closely.
  ar: {
    ...HEBREW_LAYOUT,
    page1: {
      ...HEBREW_LAYOUT.page1,
      companyName: { x: 95, y: 738, width: 130, height: 12 },
      heightValidUntil: { x: 318, y: 712, width: 82, height: 11 },
      employeeName: { x: 318, y: 680, width: 155, height: 14 },
      employeeId: { x: 348, y: 652, width: 138, height: 18 },
      jobTitle: { x: 318, y: 626, width: 155, height: 14 },
      instructorName: { x: 72, y: 680, width: 135, height: 14 },
      siteManagerName: { x: 72, y: 652, width: 135, height: 14 },
      instructorSignature: { x: 78, y: 608, width: 155, height: 40 },
    },
  },
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

/** Rasterize text so Hebrew/Arabic render correctly without embedding a PDF font. */
async function textToPng(options: {
  text: string;
  widthPt: number;
  heightPt: number;
  fontSize: number;
  align: 'left' | 'right' | 'center';
  /** Paint a soft white plate so text stays readable over the form grid. */
  backdrop?: boolean;
}): Promise<Uint8Array> {
  const scale = 3;
  const canvas = requireBrowserCanvas();
  canvas.width = Math.max(1, Math.ceil(options.widthPt * scale));
  canvas.height = Math.max(1, Math.ceil(options.heightPt * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, options.widthPt, options.heightPt);
  if (options.backdrop !== false) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, 0, options.widthPt, options.heightPt);
  }
  ctx.fillStyle = '#111111';
  ctx.font = `600 ${options.fontSize}px Heebo, Arial, sans-serif`;
  ctx.direction = options.align === 'left' ? 'ltr' : 'rtl';
  ctx.textAlign = options.align;
  ctx.textBaseline = 'middle';
  const x = options.align === 'right'
    ? options.widthPt - 3
    : options.align === 'left'
      ? 3
      : options.widthPt / 2;
  ctx.fillText(options.text, x, options.heightPt / 2 + 0.5, options.widthPt - 6);
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

async function stampText(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['getPages']>[number],
  text: string | undefined,
  box: Rect,
  align: 'left' | 'right' | 'center',
  fontSize: number,
): Promise<void> {
  const value = (text || '').trim();
  if (!value) return;
  const png = await textToPng({
    text: value,
    widthPt: box.width,
    heightPt: box.height,
    fontSize,
    align,
  });
  page.drawImage(await pdfDoc.embedPng(png), box);
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
  const pad = 3;
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
  const align = layout.align;

  const signerName = (options.assignment.signerName || options.assignment.employeeName || '').trim();
  const signerId = (options.assignment.signerIdNumber || options.assignment.employeeIdNumber || '').trim();
  const jobTitle = (options.assignment.jobTitle || options.assignment.employeeJobTitle || '').trim();
  const companyName = (options.assignment.companyName || options.assignment.clientName || '').trim();
  const instructorName = (options.assignment.instructorName || '').trim();
  const siteManagerName = (options.assignment.siteManagerName || '').trim();
  const heightDate = formatDisplayDate(options.assignment.heightTrainingValidUntil);
  const signatureDataUrl = options.assignment.signatureDataUrl;

  // ---- Page 1 header tables ----
  await stampText(pdfDoc, page1, companyName, layout.page1.companyName, align, 9);
  await stampText(pdfDoc, page1, heightDate, layout.page1.heightValidUntil, 'center', 8);
  await stampText(pdfDoc, page1, signerName, layout.page1.employeeName, align, 10);
  await stampText(pdfDoc, page1, signerId, layout.page1.employeeId, 'center', 10);
  await stampText(pdfDoc, page1, jobTitle, layout.page1.jobTitle, align, 10);
  await stampText(pdfDoc, page1, instructorName, layout.page1.instructorName, align, 10);
  await stampText(pdfDoc, page1, siteManagerName, layout.page1.siteManagerName, align, 10);
  // Instructor signature cell: reuse the employee signature as proof of briefing completion.
  await stampSignature(pdfDoc, page1, signatureDataUrl, layout.page1.instructorSignature);

  // ---- Last page acknowledgment table ----
  await stampText(pdfDoc, pageLast, signerName, layout.page2.employeeName, align, 10);
  await stampText(pdfDoc, pageLast, signerId, layout.page2.employeeId, 'center', 10);
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
