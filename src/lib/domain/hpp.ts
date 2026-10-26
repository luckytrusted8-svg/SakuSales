/**
 * Pure domain logic for HPP (Harga Pokok Penjualan) & Recipe Costing
 */

export interface IngredientCostItem {
  ingredientId: string;
  name: string;
  amount: number; // amount in base units (e.g. 50 grams)
  costPerUnit: number; // cost per single base unit (e.g. Rp 20 / gram)
  isPriceSet: boolean;
}

export type HppStatus = 'lengkap' | 'belum_lengkap' | 'nonaktif';

export interface HppCalculationResult {
  totalHpp: number;
  status: HppStatus;
  missingIngredientCount: number;
}

/**
 * Calculate cost per base unit for an ingredient
 * e.g. Rp 20.000 for 1000g package = Rp 20 / gram
 */
export function calculateIngredientCostPerUnit(purchasePrice: number, packageSize: number): number {
  if (purchasePrice <= 0 || packageSize <= 0) return 0;
  return purchasePrice / packageSize;
}

/**
 * Calculate HPP for a single recipe (product recipe or addon recipe)
 */
export function calculateRecipeCost(lines: IngredientCostItem[]): HppCalculationResult {
  if (!lines || lines.length === 0) {
    return {
      totalHpp: 0,
      status: 'lengkap',
      missingIngredientCount: 0,
    };
  }

  let totalHpp = 0;
  let missingCount = 0;

  for (const line of lines) {
    if (!line.isPriceSet || line.costPerUnit <= 0) {
      missingCount++;
    } else {
      totalHpp += Math.round(line.amount * line.costPerUnit);
    }
  }

  return {
    totalHpp,
    status: missingCount > 0 ? 'belum_lengkap' : 'lengkap',
    missingIngredientCount: missingCount,
  };
}

/**
 * Combine Product HPP and Addon HPPs for an ordered item
 */
export function calculateItemTotalHpp(
  productHpp: number,
  productHppStatus: HppStatus,
  addonHpps: { hpp: number; status: HppStatus }[] = []
): { totalHppPerPortion: number; status: HppStatus } {
  let totalHpp = Math.max(0, productHpp);
  let isComplete = productHppStatus === 'lengkap';

  for (const addon of addonHpps) {
    totalHpp += Math.max(0, addon.hpp);
    if (addon.status === 'belum_lengkap') {
      isComplete = false;
    }
  }

  return {
    totalHppPerPortion: totalHpp,
    status: isComplete ? 'lengkap' : 'belum_lengkap',
  };
}

/**
 * Calculate Gross Profit and Margin %
 * laba kotor = subtotal - (hpp * qty)
 * margin = (laba kotor / subtotal) * 100
 */
export function calculateGrossProfit(subtotal: number, hppPerPortion: number, qty: number): {
  totalHpp: number;
  grossProfit: number;
  marginPercent: number;
} {
  const safeSubtotal = Math.max(0, Math.round(subtotal));
  const safeQty = Math.max(1, Math.round(qty));
  const totalHpp = Math.max(0, Math.round(hppPerPortion * safeQty));
  const grossProfit = safeSubtotal - totalHpp;

  let marginPercent = 0;
  if (safeSubtotal > 0) {
    marginPercent = Number(((grossProfit / safeSubtotal) * 100).toFixed(2));
  }

  return {
    totalHpp,
    grossProfit,
    marginPercent,
  };
}
