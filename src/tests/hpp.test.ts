import { describe, it, expect } from 'vitest';
import {
  calculateIngredientCostPerUnit,
  calculateRecipeCost,
  calculateItemTotalHpp,
  calculateGrossProfit,
} from '../lib/domain/hpp';

describe('HPP & Recipe Costing Domain Rules', () => {
  it('Aturan 11: Biaya bahan per satuan = harga beli / isi kemasan', () => {
    // Keju Mozzarella 1000g seharga Rp 80.000 -> Rp 80 per gram
    const costPerGram = calculateIngredientCostPerUnit(80000, 1000);
    expect(costPerGram).toBe(80);

    // Kulit lumpia 50 lembar seharga Rp 10.000 -> Rp 200 per lembar (pcs)
    const costPerPcs = calculateIngredientCostPerUnit(10000, 50);
    expect(costPerPcs).toBe(200);
  });

  it('Aturan 11: Resep produk menghitung HPP per porsi', () => {
    // Resep 1 porsi Keju Aroma:
    // - 20g keju @ Rp 80 = Rp 1.600
    // - 2 lembar kulit @ Rp 200 = Rp 400
    // Total = Rp 2.000
    const lines = [
      {
        ingredientId: 'ing-1',
        name: 'Keju',
        amount: 20,
        costPerUnit: 80,
        isPriceSet: true,
      },
      {
        ingredientId: 'ing-2',
        name: 'Kulit Lumpia',
        amount: 2,
        costPerUnit: 200,
        isPriceSet: true,
      },
    ];

    const result = calculateRecipeCost(lines);
    expect(result.totalHpp).toBe(2000);
    expect(result.status).toBe('lengkap');
    expect(result.missingIngredientCount).toBe(0);
  });

  it('Aturan 12: Jika ada bahan yang belum punya harga, status HPP adalah "belum_lengkap"', () => {
    const lines = [
      {
        ingredientId: 'ing-1',
        name: 'Keju',
        amount: 20,
        costPerUnit: 80,
        isPriceSet: true,
      },
      {
        ingredientId: 'ing-3',
        name: 'Minyak Goreng',
        amount: 50,
        costPerUnit: 0, // Belum diset harga belinya!
        isPriceSet: false,
      },
    ];

    const result = calculateRecipeCost(lines);
    expect(result.status).toBe('belum_lengkap');
    expect(result.missingIngredientCount).toBe(1);
    expect(result.totalHpp).toBe(1600); // partial amount
  });

  it('HPP Item menggabungkan produk + addon varian', () => {
    // Produk HPP: Rp 2.000 (lengkap)
    // Addon Glaze HPP: Rp 500 (lengkap)
    const combined = calculateItemTotalHpp(2000, 'lengkap', [
      { hpp: 500, status: 'lengkap' },
    ]);
    expect(combined.totalHppPerPortion).toBe(2500);
    expect(combined.status).toBe('lengkap');

    // Jika addon belum lengkap, item juga belum lengkap
    const combinedIncomplete = calculateItemTotalHpp(2000, 'lengkap', [
      { hpp: 0, status: 'belum_lengkap' },
    ]);
    expect(combinedIncomplete.status).toBe('belum_lengkap');
  });

  it('Laba kotor dan margin % dihitung dengan benar', () => {
    // Jual Rp 15.000, HPP Rp 3.000, 2 porsi
    // Subtotal = Rp 30.000, Total HPP = Rp 6.000, Laba kotor = Rp 24.000
    // Margin = (24.000 / 30.000) * 100 = 80%
    const profit = calculateGrossProfit(30000, 3000, 2);
    expect(profit.totalHpp).toBe(6000);
    expect(profit.grossProfit).toBe(24000);
    expect(profit.marginPercent).toBe(80);
  });
});
