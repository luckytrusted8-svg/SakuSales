/**
 * ESC/POS Thermal Receipt Byte Encoder
 * Supports 58mm (32 chars per line) and 80mm (48 chars per line)
 */

const ESC = 0x1b;
const GS = 0x1d;

export interface PrintableReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceNumber: string;
  dateStr: string;
  cashierName: string;
  customerName?: string;
  items: {
    name: string;
    qty: number;
    subtotal: number;
    addons?: { name: string; price: number }[];
  }[];
  subtotal: number;
  discountAmount?: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  changeAmount: number;
  footerMessage?: string;
}

export function generateEscPosBytes(data: PrintableReceiptData, paperSize: '58mm' | '80mm' = '58mm'): Uint8Array {
  const lineChars = paperSize === '58mm' ? 32 : 48;
  const bytes: number[] = [];

  const addBytes = (...b: number[]) => bytes.push(...b);
  const addText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code > 127 ? 63 : code); // simple ASCII fallback
    }
  };
  const addLine = (text: string = '') => {
    addText(text);
    bytes.push(0x0a); // LF
  };

  const divider = '-'.repeat(lineChars);
  const doubleDivider = '='.repeat(lineChars);

  // Initialize printer
  addBytes(ESC, 0x40);

  // Center align
  addBytes(ESC, 0x61, 0x01);

  // Store Name (Double height & width)
  addBytes(ESC, 0x21, 0x30);
  addLine(data.storeName.toUpperCase());

  // Normal text
  addBytes(ESC, 0x21, 0x00);
  if (data.storeAddress) addLine(data.storeAddress);
  if (data.storePhone) addLine(`WA/Telp: ${data.storePhone}`);

  addLine(doubleDivider);

  // Left align for metadata
  addBytes(ESC, 0x61, 0x00);
  addLine(`No. Nota : ${data.invoiceNumber}`);
  addLine(`Tanggal  : ${data.dateStr}`);
  addLine(`Kasir    : ${data.cashierName}`);
  if (data.customerName) {
    addLine(`Pelanggan: ${data.customerName}`);
  }

  addLine(divider);

  // Items
  for (const item of data.items) {
    const itemSubtotalStr = `Rp ${item.subtotal.toLocaleString('id-ID')}`;
    const leftText = `${item.qty}x ${item.name}`;

    if (leftText.length + itemSubtotalStr.length + 1 <= lineChars) {
      const spaces = ' '.repeat(lineChars - leftText.length - itemSubtotalStr.length);
      addLine(`${leftText}${spaces}${itemSubtotalStr}`);
    } else {
      addLine(leftText);
      const spaces = ' '.repeat(Math.max(1, lineChars - itemSubtotalStr.length));
      addLine(`${spaces}${itemSubtotalStr}`);
    }

    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        const addonText = `  + ${addon.name}`;
        const addonPriceText = addon.price > 0 ? `(Rp ${addon.price.toLocaleString('id-ID')})` : '';
        addLine(`${addonText} ${addonPriceText}`);
      }
    }
  }

  addLine(divider);

  // Totals
  const printRow = (label: string, valStr: string) => {
    const spaces = ' '.repeat(Math.max(1, lineChars - label.length - valStr.length));
    addLine(`${label}${spaces}${valStr}`);
  };

  printRow('Subtotal', `Rp ${data.subtotal.toLocaleString('id-ID')}`);
  if (data.discountAmount && data.discountAmount > 0) {
    printRow('Diskon', `-Rp ${data.discountAmount.toLocaleString('id-ID')}`);
  }

  // Grand Total in Bold
  addBytes(ESC, 0x45, 0x01); // Bold ON
  printRow('TOTAL', `Rp ${data.grandTotal.toLocaleString('id-ID')}`);
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  printRow('Metode Bayar', data.paymentMethod.toUpperCase());
  if (data.paymentMethod === 'cash') {
    printRow('Bayar Tunai', `Rp ${data.amountPaid.toLocaleString('id-ID')}`);
    printRow('Kembalian', `Rp ${data.changeAmount.toLocaleString('id-ID')}`);
  }

  addLine(doubleDivider);

  // Footer message center aligned
  addBytes(ESC, 0x61, 0x01);
  addLine(data.footerMessage || 'Terima kasih atas kunjungan Anda!');
  addLine('SakuSales - Jualan Cepat');

  // Feed lines & Cut paper
  addBytes(0x0a, 0x0a, 0x0a);
  addBytes(GS, 0x56, 0x41, 0x03); // Partial cut

  return new Uint8Array(bytes);
}
