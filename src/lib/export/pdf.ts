import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StoreSettingsEntity, TransactionEntity } from '../db/schema';
import { formatRupiah } from '../format/rupiah';
import { formatDateTimeId } from '../format/date';

export interface PdfExportData {
  settings?: StoreSettingsEntity;
  periodLabel: string;
  totalTurnover: number;
  transactionCount: number;
  totalExpense: number;
  netCash: number;
  transactions: TransactionEntity[];
}

export function exportToPdf(data: PdfExportData, filename: string = 'Laporan-SakuSales.pdf') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const storeName = data.settings?.storeName || 'SakuSales Store';
  const address = data.settings?.address || '';
  const phone = data.settings?.phone ? `WA/Telp: ${data.settings.phone}` : '';

  // Header / Kop Toko
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 39, 71); // Navy #0F2747
  doc.text(storeName.toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // #6B7280
  let y = 24;
  if (address) {
    doc.text(address, 14, y);
    y += 5;
  }
  if (phone) {
    doc.text(phone, 14, y);
    y += 5;
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, 196, y + 2);

  // Document Title & Metadata
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 39, 71);
  doc.text('LAPORAN KEUANGAN & PENJUALAN', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Periode: ${data.periodLabel}`, 14, y + 5);
  doc.text(`Dicetak: ${formatDateTimeId(new Date())}`, 14, y + 10);

  // Summary Metrics Table
  y += 16;
  autoTable(doc, {
    startY: y,
    head: [['Metrik', 'Nilai']],
    body: [
      ['Total Omzet Penjualan (Lunas)', formatRupiah(data.totalTurnover)],
      ['Jumlah Transaksi Berhasil', `${data.transactionCount} Transaksi`],
      ['Total Pengeluaran Operasional', formatRupiah(data.totalExpense)],
      ['Saldo Kas Bersih', formatRupiah(data.netCash)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 39, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Transactions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 39, 71);
  doc.text('Daftar Transaksi', 14, finalY);

  const txRows = data.transactions.map((tx) => [
    tx.invoiceNumber,
    formatDateTimeId(tx.date),
    tx.cashierNameSnapshot,
    tx.customerNameSnapshot || '-',
    formatRupiah(tx.grandTotal),
    tx.paymentMethod.toUpperCase(),
    tx.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['No. Nota', 'Tanggal', 'Kasir', 'Pelanggan', 'Total', 'Metode', 'Status']],
    body: txRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 182, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(filename);
}
