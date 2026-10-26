import { describe, it, expect } from 'vitest';
import {
  calculateItemUnitPrice,
  calculateItemSubtotal,
  calculateDiscountAmount,
  calculateGrandTotal,
} from '../lib/domain/pricing';

describe('Pricing Domain Rules', () => {
  it('Aturan 1: Harga satuan = harga produk + sum(varian tambahan)', () => {
    // Example: Keju aroma Rp 11.000 + Glaze Rp 2.000 + Topping Rp 2.000 = Rp 15.000
    const basePrice = 11000;
    const addons = [
      { addonId: 'a1', name: 'Glaze Cokelat', extraPrice: 2000, qty: 1 },
      { addonId: 'a2', name: 'Topping Keju', extraPrice: 2000, qty: 1 },
    ];

    const unitPrice = calculateItemUnitPrice(basePrice, addons);
    expect(unitPrice).toBe(15000);
  });

  it('Aturan 2: Subtotal item = harga satuan * jumlah', () => {
    // 3 portions of unit price Rp 15.000 = Rp 45.000
    const basePrice = 11000;
    const addons = [
      { addonId: 'a1', name: 'Glaze Tiramisu', extraPrice: 2000, qty: 1 },
    ];
    // 11000 + 2000 = 13000 * 3 = 39000
    const subtotal = calculateItemSubtotal(basePrice, addons, 3);
    expect(subtotal).toBe(39000);
  });

  it('Aturan 3: Diskon nominal dan persen tidak boleh membuat total negatif', () => {
    const grossTotal = 50000;

    // Percent discount: 10% of 50.000 = 5.000
    const discPercent = calculateDiscountAmount(grossTotal, { type: 'percent', value: 10 });
    expect(discPercent).toBe(5000);

    // Over-discount attempt: nominal Rp 60.000 on Rp 50.000 gross total
    const discOver = calculateDiscountAmount(grossTotal, { type: 'nominal', value: 60000 });
    expect(discOver).toBe(50000); // capped at grossTotal

    // Grand total calculation: 50.000 - 60.000 capped = 0 (never negative)
    const items = [
      {
        productId: 'p1',
        name: 'Produk A',
        basePrice: 50000,
        qty: 1,
        addons: [],
      },
    ];
    const result = calculateGrandTotal(items, { type: 'nominal', value: 60000 });
    expect(result.grandTotal).toBe(0);
    expect(result.discountAmount).toBe(50000);
  });

  it('Hitung Grand Total beberapa item dengan addon berbeda', () => {
    const items = [
      {
        productId: 'p1',
        name: 'Item 1',
        basePrice: 10000,
        qty: 2, // 20.000
        addons: [],
      },
      {
        productId: 'p2',
        name: 'Item 2',
        basePrice: 15000,
        qty: 1,
        addons: [{ addonId: 'a1', name: 'Extra', extraPrice: 3000, qty: 1 }], // 18.000
      },
    ];
    // Total = 20.000 + 18.000 = 38.000
    const result = calculateGrandTotal(items, { type: 'nominal', value: 3000 });
    expect(result.grossTotal).toBe(38000);
    expect(result.discountAmount).toBe(3000);
    expect(result.grandTotal).toBe(35000);
    expect(result.totalQty).toBe(3);
  });
});
