import { describe, expect, it } from 'vitest';
import {
  TRADE_RISK_DOCUMENTS,
  TRADE_RISK_TRADES,
  getTradeRiskDocument,
  languagesForTrade,
  tradeRiskLabel,
} from '@/lib/trade-risk-documents';

describe('trade risk summary documents', () => {
  it('registers all core construction trades', () => {
    expect(TRADE_RISK_TRADES.length).toBe(13);
    expect(tradeRiskLabel('crane')).toContain('עגורנאי');
    expect(tradeRiskLabel('gypsum')).toContain('גבס');
  });

  it('includes Hebrew and Chinese-Hebrew versions for every trade', () => {
    for (const trade of TRADE_RISK_TRADES) {
      expect(getTradeRiskDocument(trade.code, 'he')).toBeTruthy();
      expect(getTradeRiskDocument(trade.code, 'zh_he')).toBeTruthy();
    }
    expect(languagesForTrade('crane')).toEqual(expect.arrayContaining(['he', 'zh_he', 'ar', 'ru']));
    expect(TRADE_RISK_DOCUMENTS.length).toBeGreaterThanOrEqual(28);
  });
});
