import { describe, it, expect } from 'vitest';
import { calculateCashChange, getQuickCashSuggestions } from '../lib/domain/change';

describe('Cash Change Domain Rules', () => {
  it('Aturan 4: Kembalian = jumlah bayar - total (tidak boleh negatif)', () => {
    // Exact payment
    const exact = calculateCashChange(25000, 25000);
    expect(exact.change).toBe(0);
    expect(exact.isSufficient).toBe(true);
    expect(exact.shortfall).toBe(0);

    // Over payment
    const over = calculateCashChange(25000, 50000);
    expect(over.change).toBe(25000);
    expect(over.isSufficient).toBe(true);

    // Insufficient payment
    const under = calculateCashChange(25000, 20000);
    expect(under.change).toBe(0); // cannot be negative
    expect(under.isSufficient).toBe(false);
    expect(under.shortfall).toBe(5000);
  });

  it('Saran pecahan uang cepat menghasilkan uang pas dan pecahan realistis', () => {
    // Grand total Rp 13.000
    const suggestions = getQuickCashSuggestions(13000);
    // Must include exact 13.000
    expect(suggestions).toContain(13000);
    // Must include common larger denominations
    expect(suggestions).toContain(20000);
    expect(suggestions).toContain(50000);
    expect(suggestions).toContain(100000);
  });
});
