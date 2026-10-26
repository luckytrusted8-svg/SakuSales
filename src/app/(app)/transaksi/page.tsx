'use client';

import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Search,
  Printer,
  Share2,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  ChevronRight,
  Bluetooth,
} from 'lucide-react';
import { transactionRepo } from '../../../lib/repositories/transactionRepo';
import { settingsRepo } from '../../../lib/repositories/settingsRepo';
import type { TransactionEntity, StoreSettingsEntity } from '../../../lib/db/schema';
import { formatRupiah } from '../../../lib/format/rupiah';
import { formatDateTimeId, toLocalDateString } from '../../../lib/format/date';
import { useAuthStore } from '../../../stores/authStore';
import { EmptyState } from '../../../components/shared/EmptyState';
import { bluetoothPrinter } from '../../../lib/printing/bluetooth';
import { shareReceiptToWhatsApp, triggerBrowserPrint } from '../../../lib/printing/browserPrint';
import type { PrintableReceiptData } from '../../../lib/printing/escpos';

export default function RiwayatTransaksiPage() {
  const { currentUser } = useAuthStore();
  const isOwner = currentUser?.role === 'owner';

  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [settings, setSettings] = useState<StoreSettingsEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const loadTransactions = async () => {
    try {
      const todayDateOnly = toLocalDateString(new Date());
      const txs = await transactionRepo.getRecent(
        100,
        filterDate === 'today' && !isOwner ? todayDateOnly : filterDate === 'today' ? todayDateOnly : undefined
      );
      setTransactions(txs);

      const storeSettings = await settingsRepo.get();
      if (storeSettings) setSettings(storeSettings);
    } catch (err) {
      console.error('Load transactions error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filterDate]);

  const openDetail = async (tx: TransactionEntity) => {
    const full = await transactionRepo.getById(tx.id);
    setSelectedTx(full);
  };

  const handleReprintBluetooth = async () => {
    if (!selectedTx) return;
    const tx = selectedTx.transaction;

    const printableData: PrintableReceiptData = {
      storeName: settings?.storeName || 'SakuSales',
      storeAddress: settings?.address || '',
      storePhone: settings?.phone || '',
      invoiceNumber: tx.invoiceNumber,
      dateStr: formatDateTimeId(tx.date),
      cashierName: tx.cashierNameSnapshot,
      customerName: tx.customerNameSnapshot || undefined,
      items: (selectedTx.items || []).map((it: any) => ({
        name: it.productNameSnapshot,
        qty: it.qty,
        subtotal: it.subtotal,
        addons: (it.addons || []).map((a: any) => ({
          name: a.addonNameSnapshot,
          price: a.addonPriceSnapshot,
        })),
      })),
      subtotal: tx.subtotal,
      discountAmount: tx.discountAmount,
      grandTotal: tx.grandTotal,
      paymentMethod: tx.paymentMethod,
      amountPaid: tx.amountPaid,
      changeAmount: tx.changeAmount,
      footerMessage: settings?.receiptFooter || 'Terima kasih atas kunjungan Anda!',
    };

    const res = await bluetoothPrinter.printReceipt(
      printableData,
      settings?.receiptPaperSize || '58mm'
    );
    if (!res.success) {
      alert(res.error || 'Gagal cetak Bluetooth');
    }
  };

  const handleReprintBrowser = () => {
    if (!selectedTx) return;
    const tx = selectedTx.transaction;

    const area = document.getElementById('thermal-print-area');
    if (area) {
      area.innerHTML = `
        <div class="${settings?.receiptPaperSize === '80mm' ? 'receipt-paper-80mm' : 'receipt-paper-58mm'} mx-auto">
          <div style="text-align:center; font-weight:bold; font-size:14px;">${(settings?.storeName || 'SakuSales').toUpperCase()}</div>
          <div style="text-align:center; font-size:10px;">${settings?.address || ''}</div>
          <div style="text-align:center; font-size:10px;">${settings?.phone ? 'Telp: ' + settings.phone : ''}</div>
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          <div>No. Nota : ${tx.invoiceNumber}</div>
          <div>Tanggal  : ${formatDateTimeId(tx.date)}</div>
          <div>Kasir    : ${tx.cashierNameSnapshot}</div>
          ${tx.customerNameSnapshot ? `<div>Pelanggan: ${tx.customerNameSnapshot}</div>` : ''}
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          ${(selectedTx.items || []).map((it: any) => `
            <div style="display:flex; justify-content:space-between;">
              <span>${it.qty}x ${it.productNameSnapshot}</span>
              <span>Rp ${it.subtotal.toLocaleString('id-ID')}</span>
            </div>
            ${(it.addons || []).map((a: any) => `<div style="padding-left:8px; font-size:9px;">+ ${a.addonNameSnapshot}</div>`).join('')}
          `).join('')}
          <div style="border-top:1px dashed #000; margin:4px 0;"></div>
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>TOTAL:</span>
            <span>Rp ${tx.grandTotal.toLocaleString('id-ID')}</span>
          </div>
          <div>Metode: ${tx.paymentMethod.toUpperCase()}</div>
          ${tx.paymentMethod === 'cash' ? `
            <div>Bayar : Rp ${tx.amountPaid.toLocaleString('id-ID')}</div>
            <div>Kembali: Rp ${tx.changeAmount.toLocaleString('id-ID')}</div>
          ` : ''}
          <div style="border-top:1px dashed #000; margin:6px 0;"></div>
          <div style="text-align:center; font-size:10px;">${settings?.receiptFooter || 'Terima kasih!'}</div>
        </div>
      `;
    }
    triggerBrowserPrint();
  };

  const handleShareWA = () => {
    if (!selectedTx) return;
    const tx = selectedTx.transaction;

    const printableData: PrintableReceiptData = {
      storeName: settings?.storeName || 'SakuSales',
      storeAddress: settings?.address || '',
      storePhone: settings?.phone || '',
      invoiceNumber: tx.invoiceNumber,
      dateStr: formatDateTimeId(tx.date),
      cashierName: tx.cashierNameSnapshot,
      customerName: tx.customerNameSnapshot || undefined,
      items: (selectedTx.items || []).map((it: any) => ({
        name: it.productNameSnapshot,
        qty: it.qty,
        subtotal: it.subtotal,
        addons: (it.addons || []).map((a: any) => ({
          name: a.addonNameSnapshot,
          price: a.addonPriceSnapshot,
        })),
      })),
      subtotal: tx.subtotal,
      discountAmount: tx.discountAmount,
      grandTotal: tx.grandTotal,
      paymentMethod: tx.paymentMethod,
      amountPaid: tx.amountPaid,
      changeAmount: tx.changeAmount,
      footerMessage: settings?.receiptFooter || 'Terima kasih atas kunjungan Anda!',
    };

    shareReceiptToWhatsApp(printableData);
  };

  const handleConfirmCancel = async () => {
    if (!selectedTx || !cancelReason.trim()) {
      setCancelError('Alasan pembatalan wajib diisi');
      return;
    }

    try {
      await transactionRepo.cancelTransaction({
        transactionId: selectedTx.transaction.id,
        canceledByUserId: currentUser?.id || 'owner',
        canceledByUserName: currentUser?.name || 'Owner',
        reason: cancelReason.trim(),
      });
      setIsCancelModalOpen(false);
      setSelectedTx(null);
      setCancelReason('');
      loadTransactions();
    } catch (err: any) {
      setCancelError(err.message || 'Gagal membatalkan transaksi');
    }
  };

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchInv = t.invoiceNumber.toLowerCase().includes(q);
    const matchCust = (t.customerNameSnapshot || '').toLowerCase().includes(q);
    return matchInv || matchCust;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2747]">Riwayat Transaksi</h1>
          <p className="text-xs text-[#6B7280]">
            Daftar penjualan, pencetakan ulang struk, dan jejak audit
          </p>
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterDate('today')}
              className={`pos-btn px-4 py-2 text-xs font-bold rounded-xl ${
                filterDate === 'today'
                  ? 'saku-gradient-bg text-white shadow-xs'
                  : 'bg-white border border-[#E2E8F0] text-[#0F2747]'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('all')}
              className={`pos-btn px-4 py-2 text-xs font-bold rounded-xl ${
                filterDate === 'all'
                  ? 'saku-gradient-bg text-white shadow-xs'
                  : 'bg-white border border-[#E2E8F0] text-[#0F2747]'
              }`}
            >
              Semua Riwayat
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B7280]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor nota atau nama pelanggan..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
        />
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#6B7280]">Memuat data transaksi...</div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada transaksi"
          description="Transaksi penjualan yang selesai di kasir akan otomatis tercatat dan tersimpan rapi di sini."
          actionLabel="Buka Layar Kasir"
          onAction={() => (window.location.href = '/kasir')}
        />
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#E2E8F0]">
          Tidak ada nota yang cocok dengan pencarian "{search}"
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              onClick={() => openDetail(tx)}
              className="p-4 bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#1EB6E6] shadow-xs cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.status === 'lunas'
                      ? 'bg-emerald-50 text-[#22C55E]'
                      : tx.status === 'piutang'
                      ? 'bg-amber-50 text-[#F59E0B]'
                      : 'bg-red-50 text-[#EF4444]'
                  }`}
                >
                  <ReceiptText className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0F2747]">
                      {tx.invoiceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        tx.status === 'lunas'
                          ? 'bg-emerald-50 text-emerald-700'
                          : tx.status === 'piutang'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {formatDateTimeId(tx.date)} • Kasir: {tx.cashierNameSnapshot}
                    {tx.customerNameSnapshot ? ` • ${tx.customerNameSnapshot}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-base font-extrabold text-[#0F2747]">
                    {formatRupiah(tx.grandTotal)}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">
                    {tx.paymentMethod}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base font-bold text-[#0F2747]">
                  Nota {selectedTx.transaction.invoiceNumber}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {formatDateTimeId(selectedTx.transaction.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-[#0F2747] text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Cancel Warning if Batal */}
            {selectedTx.transaction.status === 'batal' && (
              <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <p className="font-bold">Transaksi Dibatalkan</p>
                <p>Oleh: {selectedTx.transaction.canceledBy || 'Owner'}</p>
                <p>Alasan: "{selectedTx.transaction.cancelReason || '-'}"</p>
              </div>
            )}

            {/* Item Rows */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
              {(selectedTx.items || []).map((it: any) => (
                <div
                  key={it.id}
                  className="p-3 bg-[#F5F8FB] rounded-xl border border-[#E2E8F0] text-xs"
                >
                  <div className="flex justify-between font-bold text-[#0F2747]">
                    <span>
                      {it.qty}x {it.productNameSnapshot}
                    </span>
                    <span>{formatRupiah(it.subtotal)}</span>
                  </div>
                  {it.addons && it.addons.length > 0 && (
                    <div className="space-y-0.5 mt-1 text-[11px] text-cyan-800">
                      {it.addons.map((a: any) => (
                        <p key={a.id}>+ {a.addonNameSnapshot}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t border-[#E2E8F0] pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(selectedTx.transaction.subtotal)}</span>
                </div>
                {selectedTx.transaction.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(selectedTx.transaction.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-[#0F2747] pt-1">
                  <span>Total:</span>
                  <span>{formatRupiah(selectedTx.transaction.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Metode Bayar:</span>
                  <span className="font-bold uppercase">{selectedTx.transaction.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleReprintBluetooth}
                className="pos-btn w-full saku-gradient-bg text-white text-xs font-bold shadow-xs py-2.5"
              >
                <Bluetooth className="w-4 h-4 mr-2" />
                Cetak Bluetooth (Thermal)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReprintBrowser}
                  className="pos-btn bg-[#F5F8FB] border border-[#E2E8F0] hover:bg-white text-xs font-semibold py-2 text-[#0F2747]"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Cetak Browser
                </button>
                <button
                  type="button"
                  onClick={handleShareWA}
                  className="pos-btn bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold py-2 text-emerald-800"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Kirim WA
                </button>
              </div>

              {/* Owner Cancellation Option */}
              {isOwner && selectedTx.transaction.status !== 'batal' && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="pos-btn w-full bg-red-50 text-[#EF4444] hover:bg-red-100 text-xs font-bold py-2 mt-2"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Batalkan Transaksi Ini (Hanya Owner)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL REASON MODAL */}
      {isCancelModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EF4444] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F2747] text-center mb-1">
              Batalkan Transaksi?
            </h3>
            <p className="text-xs text-[#6B7280] text-center mb-4">
              Transaksi yang dibatalkan tidak akan dihitung ke dalam omzet dan saldo kas, namun tetap tercatat dalam riwayat audit.
            </p>

            {cancelError && (
              <div className="mb-3 p-2.5 bg-red-50 text-[#EF4444] text-xs font-semibold rounded-xl">
                {cancelError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-[#0F2747] mb-1">
                Alasan Pembatalan <span className="text-[#EF4444]">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Pelanggan membatalkan pesanan, salah input jumlah..."
                className="w-full p-3 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="pos-btn flex-1 bg-[#EF4444] text-white text-xs font-bold hover:bg-red-600 shadow-xs"
              >
                Ya, Batalkan Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
