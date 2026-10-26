import { describe, it, expect } from 'vitest';
import { formatInvoiceNumber, extractInvoiceSequence } from '../lib/domain/invoice';

describe('Invoice Number Domain Rules', () => {
  it('Aturan 7: Nomor nota unik dan berurutan {PREFIX}-YYYYMMDD-{SEQ}', () => {
    const testDate = new Date(2026, 9, 26); // 26 Oktober 2026
    const inv1 = formatInvoiceNumber('SS', testDate, 1);
    expect(inv1).toBe('SS-20261026-0001');

    const inv42 = formatInvoiceNumber('SS', testDate, 42);
    expect(inv42).toBe('SS-20261026-0042');

    // Custom store prefix e.g. KA (Keju Aroma)
    const invKA = formatInvoiceNumber('KA', testDate, 5);
    expect(invKA).toBe('KA-20261026-0005');
  });

  it('Ekstraksi sequence invoice dari string invoice', () => {
    const seq = extractInvoiceSequence('SS-20261026-0035', '20261026');
    expect(seq).toBe(35);

    // If date does not match, returns null
    const mismatch = extractInvoiceSequence('SS-20261025-0035', '20261026');
    expect(mismatch).toBeNull();
  });
});
