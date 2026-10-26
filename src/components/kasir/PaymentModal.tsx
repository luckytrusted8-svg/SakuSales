'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  QrCode,
  ArrowRightLeft,
  CalendarClock,
  User,
  Percent,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { PaymentMethod, TransactionEntity } from '../../lib/db/schema';
import { db } from '../../lib/db';
import { formatRupiah } from '../../lib/format/rupiah';
import { calculateCashChange, getQuickCashSuggestions } from '../../lib/domain/change';
import { transactionRepo } from '../../lib/repositories/transactionRepo';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: (tx: TransactionEntity) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuthStore();
  const { items, discount, setDiscount, clearCart } = useCartStore();

  const isOwner = currentUser?.role === 'owner';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Discount settings (Owner only)
  const [showDiscountInput, setShowDiscountInput] = useState(Boolean(discount));
  const [discountType, setDiscountType] = useState<'nominal' | 'percent'>(discount?.type || 'nominal');
  const [discountVal, setDiscountVal] = useState(discount?.value?.toString() || '');

  // Calculate totals
  const currentDiscount = discountVal && parseFloat(discountVal) > 0
    ? { type: discountType, value: parseFloat(discountVal) }
    : null;

  const rawSubtotal = items.reduce((sum, it) => {
    const addonsTotal = (it.addons || []).reduce((aSum, a) => aSum + a.extraPrice * (a.qty || 1), 0);
    return sum + (it.basePrice + addonsTotal) * it.qty;
  }, 0);

  let discountAmount = 0;
  if (currentDiscount) {
    if (currentDiscount.type === 'percent') {
      discountAmount = Math.round((rawSubtotal * Math.min(100, currentDiscount.value)) / 100);
    } else {
      discountAmount = Math.min(rawSubtotal, Math.round(currentDiscount.value));
    }
  }

  const grandTotal = Math.max(0, rawSubtotal - discountAmount);
  const cashNum = parseInt(cashGiven.replace(/[^0-9]/g, ''), 10) || 0;
  const changeResult = calculateCashChange(grandTotal, cashNum);
  const quickSuggestions = getQuickCashSuggestions(grandTotal);

  // Load customer suggestions
  useEffect(() => {
    async function loadCustomers() {
      const all = await db.customers.toArray();
      setCustomerSuggestions(all.map((c) => c.name));
    }
    loadCustomers();
  }, []);

  const handleSelectQuickCash = (amount: number) => {
    setCashGiven(amount.toString());
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('Keranjang kosong');
      return;
    }

    if (paymentMethod === 'cash') {
      if (!changeResult.isSufficient) {
        setErrorMsg(`Jumlah uang tunai kurang ${formatRupiah(changeResult.shortfall)}`);
        return;
      }
    } else if (paymentMethod === 'receivable') {
      if (!customerName.trim()) {
        setErrorMsg('Nama pelanggan wajib diisi untuk transaksi Piutang / Kasbon');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Map cart items for repository
      const txItems = items.map((it) => {
        const addonsTotal = (it.addons || []).reduce((sum, a) => sum + a.extraPrice * (a.qty || 1), 0);
        const itemSubtotal = (it.basePrice + addonsTotal) * it.qty;

        return {
          productId: it.productId,
          productNameSnapshot: it.name,
          unitPriceSnapshot: it.basePrice,
          qty: it.qty,
          subtotal: itemSubtotal,
          hppSnapshot: it.baseHpp,
          hppStatus: it.isHppComplete ? ('lengkap' as const) : ('belum_lengkap' as const),
          addons: (it.addons || []).map((a) => ({
            addonId: a.addonId,
            addonNameSnapshot: a.name,
            addonPriceSnapshot: a.extraPrice,
            addonHppSnapshot: 0,
          })),
        };
      });

      const tx = await transactionRepo.create({
        subtotal: rawSubtotal,
        discountType: currentDiscount?.type,
        discountValue: currentDiscount?.value,
        discountAmount,
        grandTotal,
        paymentMethod,
        amountPaid: paymentMethod === 'cash' ? cashNum : grandTotal,
        changeAmount: paymentMethod === 'cash' ? changeResult.change : 0,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        cashierId: currentUser?.id || 'kasir',
        cashierName: currentUser?.name || 'Kasir',
        items: txItems,
      });

      clearCart();
      onSuccess(tx);
    } catch (err: any) {
      console.error('Submit transaction error:', err);
      setErrorMsg(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-bold text-[#0F2747]">Pembayaran</h2>
            <p className="text-xs text-[#6B7280]">
              Total Tagihan:{' '}
              <span className="font-extrabold text-base text-[#0F2747]">
                {formatRupiah(grandTotal)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#0F2747] rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 text-[#EF4444] text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Payment Method Tabs */}
          <div>
            <label className="block text-xs font-bold text-[#0F2747] mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`pos-btn p-3 flex-col rounded-2xl border text-xs font-bold transition-all ${
                  paymentMethod === 'cash'
                    ? 'saku-gradient-bg text-white border-transparent shadow-xs'
                    : 'bg-white border-[#E2E8F0] text-[#0F2747] hover:bg-[#F5F8FB]'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`pos-btn p-3 flex-col rounded-2xl border text-xs font-bold transition-all ${
                  paymentMethod === 'qris'
                    ? 'saku-gradient-bg text-white border-transparent shadow-xs'
                    : 'bg-white border-[#E2E8F0] text-[#0F2747] hover:bg-[#F5F8FB]'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span>QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`pos-btn p-3 flex-col rounded-2xl border text-xs font-bold transition-all ${
                  paymentMethod === 'transfer'
                    ? 'saku-gradient-bg text-white border-transparent shadow-xs'
                    : 'bg-white border-[#E2E8F0] text-[#0F2747] hover:bg-[#F5F8FB]'
                }`}
              >
                <ArrowRightLeft className="w-5 h-5 mb-1" />
                <span>Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('receivable')}
                className={`pos-btn p-3 flex-col rounded-2xl border text-xs font-bold transition-all ${
                  paymentMethod === 'receivable'
                    ? 'bg-amber-500 text-white border-transparent shadow-xs'
                    : 'bg-white border-[#E2E8F0] text-[#0F2747] hover:bg-[#F5F8FB]'
                }`}
              >
                <CalendarClock className="w-5 h-5 mb-1" />
                <span>Piutang</span>
              </button>
            </div>
          </div>

          {/* CASH PAYMENT UI */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3 bg-[#F5F8FB] p-3.5 rounded-2xl border border-[#E2E8F0]">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  autoFocus
                  min="0"
                  step="1000"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-lg font-extrabold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectQuickCash(amt)}
                    className="pos-btn bg-white border border-[#E2E8F0] hover:border-[#1EB6E6] text-xs font-bold text-[#0F2747] px-3 py-1.5 shadow-2xs"
                  >
                    {amt === grandTotal ? 'Uang Pas' : formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Realtime Change Result */}
              {cashNum > 0 && (
                <div
                  className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                    changeResult.isSufficient
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-red-100 text-red-900'
                  }`}
                >
                  <span>{changeResult.isSufficient ? 'Kembalian:' : 'Kurang Bayar:'}</span>
                  <span className="text-base font-extrabold">
                    {changeResult.isSufficient
                      ? formatRupiah(changeResult.change)
                      : formatRupiah(changeResult.shortfall)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* QRIS / TRANSFER NOTICES */}
          {paymentMethod === 'qris' && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-[#0F2747]">Pembayaran via QRIS</p>
              <p className="text-[11px] text-[#6B7280]">
                Pastikan pelanggan telah scan QRIS toko dan pembayaran telah berhasil diverifikasi.
              </p>
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-[#0F2747]">Pembayaran via Transfer Bank / E-Wallet</p>
              <p className="text-[11px] text-[#6B7280]">
                Pastikan mutasi atau bukti transfer sudah dicek sebelum menyelesaikan transaksi.
              </p>
            </div>
          )}

          {/* PIUTANG NOTICE */}
          {paymentMethod === 'receivable' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-1">
              <p className="text-xs font-bold text-amber-900">Catat sebagai Piutang / Kasbon</p>
              <p className="text-[11px] text-amber-800">
                Data akan otomatis masuk ke daftar Piutang Pelanggan dan dapat dicicil kapan saja.
              </p>
            </div>
          )}

          {/* CUSTOMER DETAILS */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0F2747]">
              Nama Pelanggan {paymentMethod === 'receivable' ? <span className="text-[#EF4444]">*</span> : '(Opsional)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Bu Siti, Mas Danang"
                className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
              />
            </div>

            {/* Suggestions list */}
            {customerSuggestions.length > 0 && !customerName && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customerSuggestions.slice(0, 5).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCustomerName(name)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* OWNER-ONLY DISCOUNT SECTION */}
          {isOwner && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0F2747] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#1EB6E6]" />
                  Diskon Khusus (Owner)
                </span>
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-[11px] text-[#1EB6E6] font-semibold hover:underline"
                >
                  {showDiscountInput ? 'Sembunyikan' : '+ Beri Diskon'}
                </button>
              </div>

              {showDiscountInput && (
                <div className="p-3 bg-[#F5F8FB] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('nominal')}
                      className={`pos-btn px-3 py-1 text-xs font-bold rounded-lg ${
                        discountType === 'nominal' ? 'bg-[#0F2747] text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      Nominal (Rp)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`pos-btn px-3 py-1 text-xs font-bold rounded-lg ${
                        discountType === 'percent' ? 'bg-[#0F2747] text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      Persen (%)
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    placeholder={discountType === 'nominal' ? 'Contoh: 5000' : 'Contoh: 10'}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F2747]"
                  />
                  {discountAmount > 0 && (
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      Potongan diskon: -{formatRupiah(discountAmount)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E2E8F0] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
          >
            Batal
          </button>
          <button
            id="confirm-pay-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="pos-btn flex-1 saku-gradient-bg text-white text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isSubmitting ? 'Memproses...' : `Konfirmasi Bayar (${formatRupiah(grandTotal)})`}
          </button>
        </div>
      </div>
    </div>
  );
};
