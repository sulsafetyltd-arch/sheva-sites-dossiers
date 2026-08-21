/** Pure calculation helpers for the calculators page. All results are estimates. */

/** Linkage to an index (מדד): amount × currentIndex / baseIndex. */
export function linkedAmount(amount: number, baseIndex: number, currentIndex: number): number {
  if (!amount || !baseIndex || !currentIndex) return 0;
  return Math.round(amount * (currentIndex / baseIndex));
}

/** Simple late interest (ריבית פיגורים) for a given annual rate over a number of days. */
export function lateInterest(amount: number, annualRatePct: number, days: number): number {
  if (!amount || !annualRatePct || !days) return 0;
  return Math.round(amount * (annualRatePct / 100) * (days / 365));
}

export interface CapitalGainsInput {
  purchasePrice: number;
  salePrice: number;
  /** Deductible expenses: improvements, purchase tax, attorney/broker fees, etc. */
  expenses: number;
  /** Inflation adjustment of the purchase price (linked purchase value). If 0, purchase price is used as-is. */
  linkedPurchasePrice: number;
}

export interface CapitalGainsResult {
  nominalGain: number;
  realGain: number;
  estimatedTax: number;
}

/**
 * Rough capital-gains (מס שבח) estimate: real gain × 25%.
 * Ignores linear reductions for pre-2014 acquisitions and personal exemptions.
 */
export function estimateCapitalGains(input: CapitalGainsInput): CapitalGainsResult {
  const base = input.linkedPurchasePrice > 0 ? input.linkedPurchasePrice : input.purchasePrice;
  const nominalGain = Math.max(0, input.salePrice - input.purchasePrice - input.expenses);
  const realGain = Math.max(0, input.salePrice - base - input.expenses);
  return {
    nominalGain: Math.round(nominalGain),
    realGain: Math.round(realGain),
    estimatedTax: Math.round(realGain * 0.25),
  };
}
