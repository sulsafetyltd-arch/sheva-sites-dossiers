import { PDFDocument } from 'pdf-lib';
import type { ConstructionInductionDocument } from '@/lib/construction-induction-documents';
import { loadConstructionInductionPdf } from '@/lib/construction-induction-documents';
import type { ConstructionInductionLanguage } from '@/types/safety-training';
import type { PublicInductionAssignment } from '@/types/safety-induction';

export const INDUCTION_DECLARATION_POINTS = [
  'הובאו בפני כל הסיכונים הכרוכים בעבודתי באתר וכי הבנתי את כל הנושאים שהודרכתי עליהם ועל פי תמצית המידע בכתב לעובד חדש, אני מתחייב בזאת לפעול על פי כל הנחיות ודרישות הבטיחות שאני נדרש להם.',
  'אני מתחייב להשתמש בציוד המגן האישי הנדרש שסופק לי ולדאוג להחליפו משנתגלה בו פגם.',
] as const;

/** PDF-point rectangles on the last page (A4 origin = bottom-left). */
interface FormSlots {
  signature: { x: number; y: number; width: number; height: number };
  name: { x: number; y: number; width: number; height: number };
  idNumber: { x: number; y: number; width: number; height: number };
  /** Text alignment inside name/id cells */
  align: 'right' | 'left';
}

/**
 * Shared Sol Safety induction templates keep the signature cell on the visual
 * left and employee details on the right, for both RTL and LTR languages.
 * Y offsets differ slightly by language because the declaration block height varies.
 */
const DEFAULT_RTL_SLOTS: FormSlots = {
  signature: { x: 38, y: 54, width: 120, height: 58 },
  // Value cells sit left of the RTL labels ("שם העובד" / "תעודת זהות").
  name: { x: 300, y: 72, width: 200, height: 16 },
  idNumber: { x: 360, y: 55, width: 140, height: 15 },
  align: 'right',
};

const DEFAULT_LTR_SLOTS: FormSlots = {
  signature: { x: 36, y: 62, width: 126, height: 58 },
  name: { x: 255, y: 98, width: 280, height: 16 },
  idNumber: { x: 255, y: 70, width: 280, height: 18 },
  align: 'left',
};

const LANGUAGE_SLOTS: Partial<Record<ConstructionInductionLanguage, FormSlots>> = {
  he: DEFAULT_RTL_SLOTS,
  ar: {
    signature: { x: 38, y: 76, width: 120, height: 58 },
    name: { x: 300, y: 108, width: 200, height: 16 },
    idNumber: { x: 360, y: 82, width: 140, height: 15 },
    align: 'right',
  },
  en: DEFAULT_LTR_SLOTS,
  ru: {
    signature: { x: 36, y: 74, width: 118, height: 58 },
    name: { x: 250, y: 112, width: 290, height: 16 },
    idNumber: { x: 250, y: 82, width: 290, height: 18 },
    align: 'left',
  },
  zh: {
    signature: { x: 36, y: 100, width: 126, height: 52 },
    name: { x: 255, y: 128, width: 280, height: 14 },
    idNumber: { x: 255, y: 104, width: 280, height: 16 },
    align: 'left',
  },
  tr: {
    signature: { x: 36, y: 98, width: 126, height: 52 },
    name: { x: 255, y: 126, width: 280, height: 14 },
    idNumber: { x: 255, y: 102, width: 280, height: 16 },
    align: 'left',
  },
  ti: {
    signature: { x: 36, y: 68, width: 126, height: 54 },
    name: { x: 255, y: 98, width: 280, height: 14 },
    idNumber: { x: 255, y: 74, width: 280, height: 16 },
    align: 'left',
  },
  ro: {
    signature: { x: 36, y: 74, width: 126, height: 58 },
    name: { x: 255, y: 112, width: 280, height: 16 },
    idNumber: { x: 255, y: 82, width: 280, height: 18 },
    align: 'left',
  },
  hi: {
    signature: { x: 36, y: 90, width: 126, height: 54 },
    name: { x: 255, y: 118, width: 280, height: 14 },
    idNumber: { x: 255, y: 96, width: 280, height: 16 },
    align: 'left',
  },
};

function slotsFor(language: ConstructionInductionLanguage): FormSlots {
  return LANGUAGE_SLOTS[language]
    ?? (language === 'he' || language === 'ar' ? DEFAULT_RTL_SLOTS : DEFAULT_LTR_SLOTS);
}

function requireBrowserCanvas(): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('יצירת PDF חתום זמינה בדפדפן בלבד');
  }
  return document.createElement('canvas');
}

/** Rasterize text with Heebo so Hebrew/Arabic render correctly without embedding a PDF font. */
async function textToPng(options: {
  text: string;
  widthPt: number;
  heightPt: number;
  fontSize: number;
  align: 'left' | 'right';
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
  ctx.textAlign = options.align;
  ctx.textBaseline = 'middle';
  const x = options.align === 'right' ? options.widthPt - 4 : 4;
  ctx.fillText(options.text, x, options.heightPt / 2, options.widthPt - 8);
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
  const page = pages[pages.length - 1];
  const slots = slotsFor(options.document.code);

  const signerName = (options.assignment.signerName || options.assignment.employeeName || '').trim();
  const signerId = (options.assignment.signerIdNumber || options.assignment.employeeIdNumber || '').trim();
  const signatureDataUrl = options.assignment.signatureDataUrl;

  if (signerName) {
    const png = await textToPng({
      text: signerName,
      widthPt: slots.name.width,
      heightPt: slots.name.height,
      fontSize: 11,
      align: slots.align,
    });
    const image = await pdfDoc.embedPng(png);
    page.drawImage(image, slots.name);
  }

  if (signerId) {
    const png = await textToPng({
      text: signerId,
      widthPt: slots.idNumber.width,
      heightPt: slots.idNumber.height,
      fontSize: 11,
      align: slots.align,
    });
    const image = await pdfDoc.embedPng(png);
    page.drawImage(image, slots.idNumber);
  }

  if (signatureDataUrl) {
    const bytes = await dataUrlToBytes(signatureDataUrl);
    const image = signatureDataUrl.includes('image/jpeg')
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);
    const pad = 4;
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
    'הוראות-בטיחות-עובד-חדש-חתום',
    signerName || options.assignment.employeeName,
    options.document.code,
  ]
    .join('-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .concat('.pdf');

  return new File([pdfBytes], fileName, { type: 'application/pdf' });
}
