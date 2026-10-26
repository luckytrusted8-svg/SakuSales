/**
 * Pure domain logic for generating unique daily invoice numbers
 * Format: {PREFIX}-{YYYYMMDD}-{SEQUENCE} (e.g. "SS-20261026-0001")
 */
import { toInvoiceDatePart } from '../format/date';

/**
 * Format invoice number from prefix, date, and sequence number
 */
export function formatInvoiceNumber(
  prefix: string,
  date: Date = new Date(),
  sequenceNumber: number = 1
): string {
  const cleanPrefix = (prefix || 'SS').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SS';
  const datePart = toInvoiceDatePart(date);
  const safeSeq = Math.max(1, Math.min(99999, Math.round(sequenceNumber)));
  const seqPart = String(safeSeq).padStart(4, '0');

  return `${cleanPrefix}-${datePart}-${seqPart}`;
}

/**
 * Extract sequence number from existing invoice number matching current date
 * Returns null if not matching date or invalid
 */
export function extractInvoiceSequence(invoiceNumber: string, datePart: string): number | null {
  if (!invoiceNumber) return null;
  const parts = invoiceNumber.split('-');
  if (parts.length < 3) return null;

  const invDate = parts[1];
  const seqStr = parts[2];

  if (invDate === datePart) {
    const seq = parseInt(seqStr, 10);
    return isNaN(seq) ? null : seq;
  }

  return null;
}
