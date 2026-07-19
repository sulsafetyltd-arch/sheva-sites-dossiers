import hebrewUrl from '@/assets/training-documents/new-worker-construction/hebrew.pdf.txt?url';
import arabicUrl from '@/assets/training-documents/new-worker-construction/arabic.pdf.txt?url';
import englishUrl from '@/assets/training-documents/new-worker-construction/english.pdf.txt?url';
import russianUrl from '@/assets/training-documents/new-worker-construction/russian.pdf.txt?url';
import chineseUrl from '@/assets/training-documents/new-worker-construction/chinese.pdf.txt?url';
import turkishUrl from '@/assets/training-documents/new-worker-construction/turkish.pdf.txt?url';
import tigrinyaUrl from '@/assets/training-documents/new-worker-construction/tigrinya.pdf.txt?url';
import romanianUrl from '@/assets/training-documents/new-worker-construction/romanian.pdf.txt?url';
import hindiUrl from '@/assets/training-documents/new-worker-construction/hindi.pdf.txt?url';
import type { ConstructionInductionLanguage } from '@/types/safety-training';

export const CONSTRUCTION_INDUCTION_DOCUMENTS: ReadonlyArray<{
  code: ConstructionInductionLanguage;
  label: string;
  nativeLabel: string;
  file: string;
  url: string;
  direction: 'rtl' | 'ltr';
}> = [
  { code: 'he', label: 'עברית', nativeLabel: 'עברית', file: 'hebrew.pdf', url: hebrewUrl, direction: 'rtl' },
  { code: 'ar', label: 'ערבית', nativeLabel: 'العربية', file: 'arabic.pdf', url: arabicUrl, direction: 'rtl' },
  { code: 'en', label: 'אנגלית', nativeLabel: 'English', file: 'english.pdf', url: englishUrl, direction: 'ltr' },
  { code: 'ru', label: 'רוסית', nativeLabel: 'Русский', file: 'russian.pdf', url: russianUrl, direction: 'ltr' },
  { code: 'zh', label: 'סינית', nativeLabel: '中文', file: 'chinese.pdf', url: chineseUrl, direction: 'ltr' },
  { code: 'tr', label: 'טורקית', nativeLabel: 'Türkçe', file: 'turkish.pdf', url: turkishUrl, direction: 'ltr' },
  { code: 'ti', label: 'טיגרינית', nativeLabel: 'ትግርኛ', file: 'tigrinya.pdf', url: tigrinyaUrl, direction: 'ltr' },
  { code: 'ro', label: 'רומנית', nativeLabel: 'Română', file: 'romanian.pdf', url: romanianUrl, direction: 'ltr' },
  { code: 'hi', label: 'הינדי', nativeLabel: 'हिन्दी', file: 'hindi.pdf', url: hindiUrl, direction: 'ltr' },
];

export type ConstructionInductionDocument =
  typeof CONSTRUCTION_INDUCTION_DOCUMENTS[number];

export async function loadConstructionInductionPdf(
  document: ConstructionInductionDocument,
): Promise<File> {
  const response = await fetch(document.url);
  if (!response.ok) throw new Error('טעינת מסמך ההדרכה נכשלה');
  return new File([await response.arrayBuffer()], document.file, { type: 'application/pdf' });
}

export async function openConstructionInductionPdf(
  document: ConstructionInductionDocument,
): Promise<void> {
  const file = await loadConstructionInductionPdf(document);
  const url = URL.createObjectURL(file);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadConstructionInductionPdf(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
