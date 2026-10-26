'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Printer,
  Share2,
  Plus,
  Bluetooth,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { TransactionEntity, StoreSettingsEntity } from '../../lib/db/schema';
import { settingsRepo } from '../../lib/repositories/settingsRepo';
import { formatRupiah } from '../../lib/format/rupiah';
import { formatDateTimeId } from '../../lib/format/date';
import { bluetoothPrinter } from '../../lib/printing/bluetooth';
import { shareReceiptToWhatsApp, triggerBrowserPrint } from '../../lib/printing/browserPrint';
import type { PrintableReceiptData } from '../../lib/printing/escpos';
import { transactionRepo } from '../../lib/repositories/transactionRepo';

interface SuccessModalProps {
  transaction: TransactionEntity;
  onDone: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ transaction, onDone }) => {
  const [settings, setSettings] = useState<StoreSettingsEntity | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }

    async function loadData() {
      const s = await settingsRepo.get();
      if (s) setSettings(s);

      const full = await transactionRepo.getById(transaction.id);
      if (full) setTxDetails(full);
    }
    loadData();
  }, [transaction.id]);

  const printableData: PrintableReceiptData = {
    storeName: settings?.storeName || 'SakuSales Store',
    storeAddress: settings?.address || '',
    storePhone: settings?.phone || '',
    invoiceNumber: transaction.invoiceNumber,
    dateStr: formatDateTimeId(transaction.date),
    cashierName: transaction.cashierNameSnapshot,
    customerName: transaction.customerNameSnapshot || undefined,
    items: (txDetails?.items || []).map((it: any) => ({
      name: it.productNameSnapshot,
      qty: it.qty,
      subtotal: it.subtotal,
      addons: (it.addons || []).map((a: any) => ({
        name: a.addonNameSnapshot,
        price: a.addonPriceSnapshot,
      })),
    })),
    subtotal: transaction.subtotal,
    discountAmount: transaction.discountAmount,
    grandTotal: transaction.grandTotal,
    paymentMethod: transaction.paymentMethod,
    amountPaid: transaction.amountPaid,
    changeAmount: transaction.changeAmount,
    footerMessage: settings?.receiptFooter || 'Terima kasih atas kunjungan Anda!',
  };

  const handlePrintBluetooth = async () => {
    setIsPrinting(true);
    setPrintStatus('Menghubungkan ke printer thermal...');

    const res = await bluetoothPrinter.printReceipt(
      printableData,
      settings?.receiptPaperSize || '58mm'
    );
    setIsPrinting(false);

    if (res.success) {
      setPrintStatus(`Struk berhasil dicetak di ${res.printerName}`);
    } else {
      setPrintStatus(res.error || 'Gagal mencetak struk via Bluetooth');
    }
  };

  const handleBrowserPrint = () => {
    // Populate thermal-print-area in layout
    const area = document.getElementById('thermal-print-area');
    if (area) {
      area.innerHTML = `
        <div class="${settings?.receiptPaperSize === '80mm' ? 'receipt-paper-80mm' : 'receipt-paper-58mm'} mx-auto">
          <div style="text-align:center; font-weight:bold; font-size:14px;">${printableData.storeName.toUpperCase()}</div>
          <div style="text-align:center; font-size:10px;">${printableData.storeAddress}</div>
          <div style="text-align:center; font-size:10px;">${printableData.storePhone}</div>
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          <div>No. Nota : ${printableData.invoiceNumber}</div>
          <div>Tanggal  : ${printableData.dateStr}</div>
          <div>Kasir    : ${printableData.cashierName}</div>
          ${printableData.customerName ? `<div>Pelanggan: ${printableData.customerName}</div>` : ''}
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          ${printableData.items.map((it) => `
            <div style="display:flex; justify-content:space-between;">
              <span>${it.qty}x ${it.name}</span>
              <span>Rp ${it.subtotal.toLocaleString('id-ID')}</span>
            </div>
            ${(it.addons || []).map((a) => `<div style="padding-left:8px; font-size:9px;">+ ${a.name}</div>`).join('')}
          `).join('')}
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>TOTAL:</span>
            <span>Rp ${printableData.grandTotal.toLocaleString('id-ID')}</span>
          </div>
          <div>Metode: ${printableData.paymentMethod.toUpperCase()}</div>
          ${printableData.paymentMethod === 'cash' ? `
            <div>Bayar : Rp ${printableData.amountPaid.toLocaleString('id-ID')}</div>
            <div>Kembali: Rp ${printableData.changeAmount.toLocaleString('id-ID')}</div>
          ` : ''}
          <div style="border-top:1px dashed #000; margin:6px 0;"></div>
          <div style="text-align:center; font-size:10px;">${printableData.footerMessage}</div>
        </div>
      `;
    }
    triggerBrowserPrint();
  };

  const handleShareWhatsApp = () => {
    shareReceiptToWhatsApp(printableData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2747]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#22C55E] flex items-center justify-center mx-auto mb-3 shadow-inner">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h2 className="text-xl font-bold text-[#0F2747]">Transaksi Berhasil!</h2>
        <p className="text-xs text-[#6B7280] font-mono mt-0.5">{transaction.invoiceNumber}</p>

        {/* Change Banner if cash */}
        {transaction.paymentMethod === 'cash' && transaction.changeAmount > 0 && (
          <div className="my-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <span className="text-xs text-emerald-800 font-semibold block">Kembalian Pelanggan:</span>
            <span className="text-2xl font-extrabold text-emerald-700">
              {formatRupiah(transaction.changeAmount)}
            </span>
          </div>
        )}

        {transaction.paymentMethod === 'receivable' && (
          <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900">
            Tercatat sebagai Piutang: {formatRupiah(transaction.grandTotal)}
          </div>
        )}

        {/* Print Status Feedback */}
        {printStatus && (
          <div className="mb-4 p-2.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs font-medium text-[#0F2747] flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#1EB6E6]" />
            <span>{printStatus}</span>
          </div>
        )}

        {/* Actions Grid */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={handlePrintBluetooth}
            disabled={isPrinting}
            className="pos-btn w-full saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95 disabled:opacity-50 py-3"
          >
            <Bluetooth className="w-4 h-4 mr-2" />
            {isPrinting ? 'Mencetak...' : 'Cetak Struk Bluetooth (Thermal)'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="pos-btn bg-[#F5F8FB] border border-[#E2E8F0] hover:bg-white text-[#0F2747] text-xs font-semibold py-2.5"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Cetak Browser
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="pos-btn bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold py-2.5"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Kirim WA
            </button>
          </div>
        </div>

        {/* Next Transaction */}
        <button
          id="finish-order-btn"
          type="button"
          onClick={onDone}
          className="pos-btn w-full bg-[#0F2747] text-white text-sm font-bold shadow-md hover:bg-[#1A385E] py-3.5"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Transaksi Baru
        </button>
      </div>
    </div>
  );
};
