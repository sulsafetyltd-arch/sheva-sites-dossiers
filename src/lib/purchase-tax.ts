/**
 * מדרגות מס רכישה — מעודכנות לתקופה 16.1.2025–15.1.2026 (רשות המסים).
 * יש לעדכן את הסכומים אחת לשנה כשמתפרסמות מדרגות חדשות.
 */
export interface TaxBracket {
  upTo: number | null;
  rate: number;
}

export const SINGLE_HOME_BRACKETS: TaxBracket[] = [
  { upTo: 1_978_745, rate: 0 },
  { upTo: 2_347_040, rate: 0.035 },
  { upTo: 6_055_070, rate: 0.05 },
  { upTo: 20_183_565, rate: 0.08 },
  { upTo: null, rate: 0.1 },
];

export const ADDITIONAL_HOME_BRACKETS: TaxBracket[] = [
  { upTo: 6_055_070, rate: 0.08 },
  { upTo: null, rate: 0.1 },
];

export interface TaxBreakdownRow {
  from: number;
  to: number | null;
  rate: number;
  tax: number;
}

export interface PurchaseTaxResult {
  total: number;
  rows: TaxBreakdownRow[];
}

export function calcPurchaseTax(amount: number, singleHome: boolean): PurchaseTaxResult {
  const brackets = singleHome ? SINGLE_HOME_BRACKETS : ADDITIONAL_HOME_BRACKETS;
  const rows: TaxBreakdownRow[] = [];
  let total = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (amount <= prev) break;
    const cap = bracket.upTo ?? Infinity;
    const slice = Math.min(amount, cap) - prev;
    if (slice > 0) {
      const tax = Math.round(slice * bracket.rate);
      rows.push({ from: prev, to: bracket.upTo, rate: bracket.rate, tax });
      total += tax;
    }
    prev = cap;
  }
  return { total, rows };
}
