import type { PrintableReceiptData } from './escpos';

/**
 * Format receipt data as clean WhatsApp text message
 */
export function formatReceiptWhatsAppText(data: PrintableReceiptData): string {
  const lines: string[] = [];

  lines.push(`*${data.storeName.toUpperCase()}*`);
  if (data.storeAddress) lines.push(data.storeAddress);
  if (data.storePhone) lines.push(`Telp/WA: ${data.storePhone}`);
  lines.push('--------------------------------');
  lines.push(`No. Nota : *${data.invoiceNumber}*`);
  lines.push(`Tanggal  : ${data.dateStr}`);
  lines.push(`Kasir    : ${data.cashierName}`);
  if (data.customerName) lines.push(`Pelanggan: ${data.customerName}`);
  lines.push('--------------------------------');

  for (const item of data.items) {
    lines.push(`${item.qty}x *${item.name}* = Rp ${item.subtotal.toLocaleString('id-ID')}`);
    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        lines.push(`   + ${addon.name} ${addon.price > 0 ? `(Rp ${addon.price.toLocaleString('id-ID')})` : ''}`);
      }
    }
  }

  lines.push('--------------------------------');
  lines.push(`Subtotal : Rp ${data.subtotal.toLocaleString('id-ID')}`);
  if (data.discountAmount && data.discountAmount > 0) {
    lines.push(`Diskon   : -Rp ${data.discountAmount.toLocaleString('id-ID')}`);
  }
  lines.push(`*TOTAL    : Rp ${data.grandTotal.toLocaleString('id-ID')}*`);
  lines.push(`Metode   : ${data.paymentMethod.toUpperCase()}`);

  if (data.paymentMethod === 'cash') {
    lines.push(`Bayar    : Rp ${data.amountPaid.toLocaleString('id-ID')}`);
    lines.push(`Kembalian: Rp ${data.changeAmount.toLocaleString('id-ID')}`);
  }

  lines.push('--------------------------------');
  lines.push(data.footerMessage || 'Terima kasih atas kunjungan Anda!');
  lines.push('_Dicatat dengan SakuSales_');

  return lines.join('\n');
}

/**
 * Open WhatsApp with prefilled receipt message
 */
export function shareReceiptToWhatsApp(data: PrintableReceiptData, targetPhone?: string) {
  const text = formatReceiptWhatsAppText(data);
  const encodedText = encodeURIComponent(text);

  let cleanPhone = (targetPhone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

/**
 * Trigger browser print dialog for thermal receipt element
 */
export function triggerBrowserPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
