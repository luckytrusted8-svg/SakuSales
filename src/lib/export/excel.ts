import * as XLSX from 'xlsx';
import type {
  TransactionEntity,
  TransactionItemEntity,
  ExpenseEntity,
  StoreSettingsEntity,
} from '../db/schema';
import { formatRupiah } from '../format/rupiah';
import { formatDateTimeId } from '../format/date';

export interface ExcelExportData {
  settings?: StoreSettingsEntity;
  transactions: TransactionEntity[];
  items: (TransactionItemEntity & { invoiceNumber: string; addonsText: string })[];
  expenses: ExpenseEntity[];
  summary: {
    periodLabel: string;
    totalTurnover: number;
    transactionCount: number;
    totalExpense: number;
    netCash: number;
    totalGrossProfit?: number;
  };
}

export function exportToExcel(data: ExcelExportData, filename: string = 'Laporan-SakuSales.xlsx') {
  const wb = XLSX.utils.book_new();

  // 1. SHEET: RINGKASAN
  const summaryRows = [
    ['LAPORAN KEUANGAN & PENJUALAN SAKUSALES'],
    ['Nama Toko', data.settings?.storeName || 'SakuSales Store'],
    ['Periode', data.summary.periodLabel],
    ['Tanggal Cetak', formatDateTimeId(new Date())],
    [],
    ['METRIK UTAMA', 'NILAI'],
    ['Total Omzet Penjualan (Lunas)', data.summary.totalTurnover],
    ['Jumlah Transaksi Selesai', data.summary.transactionCount],
    ['Total Pengeluaran Operasional', data.summary.totalExpense],
    ['Saldo Kas Bersih', data.summary.netCash],
  ];

  if (data.summary.totalGrossProfit !== undefined) {
    summaryRows.push(['Total Laba Kotor (HPP)', data.summary.totalGrossProfit]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  // 2. SHEET: TRANSAKSI
  const txHeaders = [
    'No. Nota',
    'Tanggal',
    'Status',
    'Kasir',
    'Pelanggan',
    'Subtotal',
    'Diskon',
    'Total Bayar',
    'Metode Bayar',
    'Jumlah Bayar',
    'Kembalian',
    'Alasan Batal',
  ];

  const txRows = data.transactions.map((tx) => [
    tx.invoiceNumber,
    formatDateTimeId(tx.date),
    tx.status.toUpperCase(),
    tx.cashierNameSnapshot,
    tx.customerNameSnapshot || '-',
    tx.subtotal,
    tx.discountAmount,
    tx.grandTotal,
    tx.paymentMethod.toUpperCase(),
    tx.amountPaid,
    tx.changeAmount,
    tx.cancelReason || '',
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Daftar Transaksi');

  // 3. SHEET: ITEM TERJUAL
  const itemHeaders = [
    'No. Nota',
    'Nama Produk',
    'Varian Tambahan',
    'Jumlah (Qty)',
    'Harga Satuan',
    'Subtotal',
    'HPP Satuan',
    'Status HPP',
  ];

  const itemRows = data.items.map((it) => [
    it.invoiceNumber,
    it.productNameSnapshot,
    it.addonsText || '-',
    it.qty,
    it.unitPriceSnapshot,
    it.subtotal,
    it.hppSnapshot || 0,
    it.hppStatus,
  ]);

  const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Detail Item');

  // 4. SHEET: PENGELUARAN
  const expHeaders = ['Tanggal', 'Kategori', 'Nominal', 'Catatan'];
  const expRows = data.expenses.map((e) => [
    formatDateTimeId(e.date),
    e.categoryNameSnapshot,
    e.amount,
    e.notes || '',
  ]);

  const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
  XLSX.utils.book_append_sheet(wb, wsExp, 'Pengeluaran');

  // Trigger browser download
  XLSX.writeFile(wb, filename);
}
