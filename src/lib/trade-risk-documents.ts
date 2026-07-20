const modules = import.meta.glob(
  '../assets/training-documents/trade-risk-summaries/*.pdf.txt',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

export type TradeRiskCode =
  | 'gypsum'
  | 'painter'
  | 'tiler'
  | 'welder'
  | 'plumber'
  | 'rigger'
  | 'electrician'
  | 'plasterer'
  | 'formworker'
  | 'forklift'
  | 'heavy_equipment'
  | 'crane'
  | 'stone';

export type TradeRiskLanguage = 'he' | 'zh_he' | 'ar' | 'ru';

export interface TradeRiskTrade {
  code: TradeRiskCode;
  label: string;
}

export interface TradeRiskDocument {
  tradeCode: TradeRiskCode;
  language: TradeRiskLanguage;
  label: string;
  languageLabel: string;
  file: string;
  url: string;
  direction: 'rtl' | 'ltr';
}

export const TRADE_RISK_TRADES: ReadonlyArray<TradeRiskTrade> = [
  { code: 'gypsum', label: 'עובד בגבס' },
  { code: 'painter', label: 'צבעי' },
  { code: 'tiler', label: 'רצף' },
  { code: 'welder', label: 'רתך' },
  { code: 'plumber', label: 'אינסטלטור / שרברב' },
  { code: 'rigger', label: 'אתת / עניבן' },
  { code: 'electrician', label: 'חשמלאי בניין' },
  { code: 'plasterer', label: 'טייח' },
  { code: 'formworker', label: 'טפסן / ברזלן' },
  { code: 'forklift', label: 'מלגזן' },
  { code: 'heavy_equipment', label: 'מפעיל צ.מ.ה' },
  { code: 'crane', label: 'עגורנאי / מנופאי' },
  { code: 'stone', label: 'עובד אבן / שיש' },
];

const LANGUAGE_META: Record<TradeRiskLanguage, { label: string; direction: 'rtl' | 'ltr' }> = {
  he: { label: 'עברית', direction: 'rtl' },
  zh_he: { label: 'סינית–עברית', direction: 'rtl' },
  ar: { label: 'ערבית', direction: 'rtl' },
  ru: { label: 'רוסית', direction: 'ltr' },
};

function assetUrl(tradeCode: TradeRiskCode, language: TradeRiskLanguage): string | undefined {
  const suffix = `${tradeCode}.${language}.pdf.txt`;
  const entry = Object.entries(modules).find(([path]) => path.endsWith(suffix));
  return entry?.[1];
}

export const TRADE_RISK_DOCUMENTS: ReadonlyArray<TradeRiskDocument> = TRADE_RISK_TRADES.flatMap((trade) =>
  (Object.keys(LANGUAGE_META) as TradeRiskLanguage[])
    .map((language) => {
      const url = assetUrl(trade.code, language);
      if (!url) return null;
      return {
        tradeCode: trade.code,
        language,
        label: trade.label,
        languageLabel: LANGUAGE_META[language].label,
        file: `${trade.code}-${language}.pdf`,
        url,
        direction: LANGUAGE_META[language].direction,
      } satisfies TradeRiskDocument;
    })
    .filter((item): item is TradeRiskDocument => Boolean(item)),
);

export function tradeRiskLabel(code: TradeRiskCode | string): string {
  return TRADE_RISK_TRADES.find((trade) => trade.code === code)?.label || String(code);
}

export function getTradeRiskDocument(
  tradeCode: TradeRiskCode | string,
  language: TradeRiskLanguage | string,
): TradeRiskDocument | undefined {
  return TRADE_RISK_DOCUMENTS.find(
    (document) => document.tradeCode === tradeCode && document.language === language,
  );
}

export function languagesForTrade(tradeCode: TradeRiskCode | string): TradeRiskLanguage[] {
  return TRADE_RISK_DOCUMENTS
    .filter((document) => document.tradeCode === tradeCode)
    .map((document) => document.language);
}

export async function loadTradeRiskPdf(document: TradeRiskDocument): Promise<File> {
  const response = await fetch(document.url);
  if (!response.ok) throw new Error('טעינת תמצית הסיכונים נכשלה');
  return new File([await response.arrayBuffer()], document.file, { type: 'application/pdf' });
}

export async function openTradeRiskPdf(document: TradeRiskDocument): Promise<void> {
  const file = await loadTradeRiskPdf(document);
  const url = URL.createObjectURL(file);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
