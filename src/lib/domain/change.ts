/**
 * Pure domain logic for cash payments, change calculation, and quick cash suggestions
 */

export interface ChangeCalculationResult {
  amountPaid: number;
  grandTotal: number;
  change: number;
  isSufficient: boolean;
  shortfall: number;
}

/**
 * Calculate cash change. Returns non-negative change if sufficient.
 */
export function calculateCashChange(grandTotal: number, amountPaid: number): ChangeCalculationResult {
  const safeTotal = Math.max(0, Math.round(grandTotal));
  const safePaid = Math.max(0, Math.round(amountPaid));

  if (safePaid >= safeTotal) {
    return {
      amountPaid: safePaid,
      grandTotal: safeTotal,
      change: safePaid - safeTotal,
      isSufficient: true,
      shortfall: 0,
    };
  }

  return {
    amountPaid: safePaid,
    grandTotal: safeTotal,
    change: 0,
    isSufficient: false,
    shortfall: safeTotal - safePaid,
  };
}

/**
 * Generate quick cash recommendations for fast checkout in Indonesia:
 * - Exact money (uang pas)
 * - Standard common denominations: 10k, 20k, 50k, 100k
 * - Next rounded denominations above total (e.g. for Rp 13.000 -> 15.000, 20.000, 50.000)
 */
export function getQuickCashSuggestions(grandTotal: number): number[] {
  const total = Math.max(0, Math.round(grandTotal));
  if (total === 0) return [0];

  const suggestions = new Set<number>();
  suggestions.add(total); // Uang pas

  // Common Indonesian banknotes
  const commonNotes = [10000, 20000, 50000, 100000];
  for (const note of commonNotes) {
    if (note > total) {
      suggestions.add(note);
    }
  }

  // Rounded next 5k or 10k note if total is odd (e.g. 11.000 -> 15.000 or 20.000)
  const roundUp5k = Math.ceil(total / 5000) * 5000;
  if (roundUp5k > total) {
    suggestions.add(roundUp5k);
  }

  const roundUp10k = Math.ceil(total / 10000) * 10000;
  if (roundUp10k > total) {
    suggestions.add(roundUp10k);
  }

  // Sort ascending and limit to top 4 options
  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 5);
}
