import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import type { ConstructionInductionDocument } from '@/lib/construction-induction-documents';
import { loadConstructionInductionPdf } from '@/lib/construction-induction-documents';
import type { PublicInductionAssignment } from '@/types/safety-induction';

export const INDUCTION_DECLARATION_POINTS = [
  'הובאו בפני כל הסיכונים הכרוכים בעבודתי באתר וכי הבנתי את כל הנושאים שהודרכתי עליהם ועל פי תמצית המידע בכתב לעובד חדש, אני מתחייב בזאת לפעול על פי כל הנחיות ודרישות הבטיחות שאני נדרש להם.',
  'אני מתחייב להשתמש בציוד המגן האישי הנדרש שסופק לי ולדאוג להחליפו משנתגלה בו פגם.',
] as const;

export async function buildSignedInductionPdfFile(options: {
  assignment: PublicInductionAssignment;
  document: ConstructionInductionDocument;
  sheetElement: HTMLElement;
}): Promise<File> {
  const original = await loadConstructionInductionPdf(options.document);
  const pdfDoc = await PDFDocument.load(await original.arrayBuffer());
  const canvas = await html2canvas(options.sheetElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const image = await pdfDoc.embedPng(canvas.toDataURL('image/png'));
  const page = pdfDoc.addPage([595.28, 841.89]);
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
    'הוראות-בטיחות-עובד-חדש-חתום',
    options.assignment.signerName || options.assignment.employeeName,
    options.document.code,
  ]
    .join('-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .concat('.pdf');

  return new File([bytes], fileName, { type: 'application/pdf' });
}
