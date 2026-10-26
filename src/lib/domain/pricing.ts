/**
 * Pure domain logic for pricing, discounts, and item subtotals
 */

export interface AddonItemSelection {
  addonId: string;
  name: string;
  extraPrice: number;
  qty?: number; // usually 1 per portion, or custom count
}

export interface CartItemModel {
  productId: string;
  name: string;
  basePrice: number;
  qty: number;
  addons: AddonItemSelection[];
  notes?: string;
  // HPP fields (if enabled)
  baseHpp?: number;
  addonHppTotal?: number;
  isHppComplete?: boolean;
}

export type DiscountType = 'nominal' | 'percent';

export interface DiscountConfig {
  type: DiscountType;
  value: number;
}

/**
 * Calculate single item unit price: basePrice + sum(extraPrice * qty)
 */
export function calculateItemUnitPrice(basePrice: number, addons: AddonItemSelection[] = []): number {
  const safeBasePrice = Math.max(0, Math.round(basePrice));
  const addonsTotal = addons.reduce((sum, addon) => {
    const qty = addon.qty && addon.qty > 0 ? addon.qty : 1;
    const extraPrice = Math.max(0, Math.round(addon.extraPrice || 0));
    return sum + (extraPrice * qty);
  }, 0);

  return safeBasePrice + addonsTotal;
}

/**
 * Calculate subtotal for one item row: unitPrice * qty
 */
export function calculateItemSubtotal(basePrice: number, addons: AddonItemSelection[] = [], qty: number): number {
  const safeQty = Math.max(1, Math.round(qty));
  const unitPrice = calculateItemUnitPrice(basePrice, addons);
  return unitPrice * safeQty;
}

/**
 * Calculate total discount amount in Rupiah based on gross total
 * Discount cannot make total negative (discount <= grossTotal)
 */
export function calculateDiscountAmount(grossTotal: number, discount?: DiscountConfig | null): number {
  if (!discount || discount.value <= 0 || grossTotal <= 0) {
    return 0;
  }

  let calculated = 0;
  if (discount.type === 'percent') {
    const percentage = Math.min(100, Math.max(0, discount.value));
    calculated = Math.round((grossTotal * percentage) / 100);
  } else {
    calculated = Math.max(0, Math.round(discount.value));
  }

  // Cap at grossTotal so grand total is at least 0
  return Math.min(grossTotal, calculated);
}

/**
 * Calculate grand total: sum(itemSubtotals) - discount
 */
export function calculateGrandTotal(items: CartItemModel[], discount?: DiscountConfig | null): {
  grossTotal: number;
  discountAmount: number;
  grandTotal: number;
  totalQty: number;
} {
  let grossTotal = 0;
  let totalQty = 0;

  for (const item of items) {
    const subtotal = calculateItemSubtotal(item.basePrice, item.addons, item.qty);
    grossTotal += subtotal;
    totalQty += Math.max(1, Math.round(item.qty));
  }

  const discountAmount = calculateDiscountAmount(grossTotal, discount);
  const grandTotal = Math.max(0, grossTotal - discountAmount);

  return {
    grossTotal,
    discountAmount,
    grandTotal,
    totalQty,
  };
}
