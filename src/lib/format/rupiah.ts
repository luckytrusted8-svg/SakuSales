/**
 * Format integer to Indonesian Rupiah representation: "Rp 11.000"
 * Rupiah stored as integer without decimals.
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }

  const isNegative = amount < 0;
  const absoluteValue = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(absoluteValue);

  return `${isNegative ? '-' : ''}Rp ${formatted}`;
}

/**
 * Parse string or formatted number to integer Rupiah
 */
export function parseRupiah(input: string | number): number {
  if (typeof input === 'number') {
    return Math.max(0, Math.round(input));
  }
  const clean = input.replace(/[^0-9]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}
