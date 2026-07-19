import hebrewUrl from '@/assets/training-documents/new-worker-construction/hebrew.pdf?url';
import arabicUrl from '@/assets/training-documents/new-worker-construction/arabic.pdf?url';
import englishUrl from '@/assets/training-documents/new-worker-construction/english.pdf?url';
import russianUrl from '@/assets/training-documents/new-worker-construction/russian.pdf?url';
import chineseUrl from '@/assets/training-documents/new-worker-construction/chinese.pdf?url';
import turkishUrl from '@/assets/training-documents/new-worker-construction/turkish.pdf?url';
import tigrinyaUrl from '@/assets/training-documents/new-worker-construction/tigrinya.pdf?url';
import romanianUrl from '@/assets/training-documents/new-worker-construction/romanian.pdf?url';
import hindiUrl from '@/assets/training-documents/new-worker-construction/hindi.pdf?url';
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
