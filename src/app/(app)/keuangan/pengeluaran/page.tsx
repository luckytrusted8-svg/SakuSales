'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  Camera,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { expenseRepo } from '../../../../lib/repositories/expenseRepo';
import { categoryRepo } from '../../../../lib/repositories/categoryRepo';
import { receivableRepo } from '../../../../lib/repositories/receivableRepo';
import type { ExpenseEntity, OtherIncomeEntity, ReceivableRecordEntity, CategoryEntity } from '../../../../lib/db/schema';
import { formatRupiah } from '../../../../lib/format/rupiah';
import { formatDateTimeId, formatDateId, toLocalDateString } from '../../../../lib/format/date';
import { useAuthStore } from '../../../../stores/authStore';
import { EmptyState } from '../../../../components/shared/EmptyState';

export default function KeuanganPage() {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes' | 'receivables'>('expenses');

  const [expenses, setExpenses] = useState<ExpenseEntity[]>([]);
  const [incomes, setIncomes] = useState<OtherIncomeEntity[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRecordEntity[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Expense
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expDate, setExpDate] = useState(toLocalDateString());
  const [expPhoto, setExpPhoto] = useState<string>('');
  const [expError, setExpError] = useState('');

  // Modal Category
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Modal Other Income
  const [isIncModalOpen, setIsIncModalOpen] = useState(false);
  const [incName, setIncName] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incNotes, setIncNotes] = useState('');

  // Modal Pay Receivable
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingReceivable, setPayingReceivable] = useState<ReceivableRecordEntity | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [exps, incs, recs, cats] = await Promise.all([
        expenseRepo.getAll(),
        expenseRepo.getAllIncomes(),
        receivableRepo.getAll(),
        categoryRepo.getAll('expense'),
      ]);
      setExpenses(exps);
      setIncomes(incs);
      setReceivables(recs);
      setExpenseCategories(cats);
    } catch (err) {
      console.error('Load keuangan error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Image compressor using HTML5 canvas
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setExpPhoto(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');

    const amt = parseInt(expAmount.replace(/[^0-9]/g, ''), 10);
    if (!expCategory) {
      setExpError('Pilih kategori pengeluaran');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setExpError('Nominal pengeluaran harus lebih besar dari Rp 0');
      return;
    }

    try {
      await expenseRepo.create({
        categoryId: expCategory,
        amount: amt,
        notes: expNotes,
        date: new Date(expDate).toISOString(),
        receiptPhotoUrl: expPhoto || undefined,
      });

      setNotice({ type: 'success', message: 'Pengeluaran berhasil dicatat' });
      setIsExpModalOpen(false);
      setExpAmount('');
      setExpNotes('');
      setExpPhoto('');
      loadData();
    } catch (err: any) {
      setExpError(err.message || 'Gagal menyimpan pengeluaran');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const created = await categoryRepo.create(newCatName, 'expense');
      setNewCatName('');
      setIsCatModalOpen(false);
      setExpenseCategories((prev) => [...prev, created]);
      setExpCategory(created.id);
      setNotice({ type: 'success', message: `Kategori "${created.name}" dibuat` });
    } catch (err: any) {
      alert(err.message || 'Gagal membuat kategori');
    }
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(incAmount.replace(/[^0-9]/g, ''), 10);
    if (!incName.trim() || isNaN(amt) || amt <= 0) {
      alert('Nama dan nominal pemasukan valid wajib diisi');
      return;
    }

    try {
      await expenseRepo.createIncome({
        categoryName: incName,
        amount: amt,
        notes: incNotes,
      });
      setNotice({ type: 'success', message: 'Pemasukan lain berhasil dicatat' });
      setIsIncModalOpen(false);
      setIncName('');
      setIncAmount('');
      setIncNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan');
    }
  };

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingReceivable) return;

    const amt = parseInt(payAmount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amt) || amt <= 0) {
      alert('Nominal cicilan tidak valid');
      return;
    }

    try {
      const res = await receivableRepo.recordInstallment({
        receivableId: payingReceivable.id,
        amount: amt,
        paymentMethod: payMethod,
        cashierId: currentUser?.id || 'kasir',
      });

      setNotice({
        type: 'success',
        message: res.isFullyPaid
          ? `Piutang ${payingReceivable.customerName} LUNAS!`
          : `Cicilan Rp ${amt.toLocaleString('id-ID')} berhasil dicatat. Sisa: ${formatRupiah(res.receivable.remainingDebt)}`,
      });
      setIsPayModalOpen(false);
      setPayingReceivable(null);
      setPayAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses cicilan');
    }
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomeSum = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalReceivableSum = receivables
    .filter((r) => r.status === 'belum_lunas')
    .reduce((sum, r) => sum + r.remainingDebt, 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2747]">Pencatatan Keuangan</h1>
          <p className="text-xs text-[#6B7280]">
            Pengeluaran operasional, pemasukan lain, dan pelunasan piutang pelanggan
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'expenses' && (
            <>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(true)}
                className="pos-btn bg-white border border-[#E2E8F0] text-[#0F2747] px-4 py-2.5 text-xs font-bold hover:bg-[#F5F8FB]"
              >
                <Tag className="w-4 h-4 mr-1.5" />
                + Kategori
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpCategory(expenseCategories[0]?.id || '');
                  setIsExpModalOpen(true);
                }}
                className="pos-btn saku-gradient-bg text-white px-5 py-2.5 text-xs font-bold shadow-xs hover:opacity-95"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Catat Pengeluaran
              </button>
            </>
          )}

          {activeTab === 'incomes' && (
            <button
              type="button"
              onClick={() => setIsIncModalOpen(true)}
              className="pos-btn saku-gradient-bg text-white px-5 py-2.5 text-xs font-bold shadow-xs hover:opacity-95"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Catat Pemasukan Lain
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs font-semibold text-[#6B7280]">Total Pengeluaran:</span>
          </div>
          <p className="text-xl font-extrabold text-[#EF4444]">
            {formatRupiah(totalExpenseSum)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-4 h-4 text-[#22C55E]" />
            <span className="text-xs font-semibold text-[#6B7280]">Pemasukan Lain:</span>
          </div>
          <p className="text-xl font-extrabold text-[#22C55E]">
            {formatRupiah(totalIncomeSum)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs font-semibold text-[#6B7280]">Sisa Piutang Berjalan:</span>
          </div>
          <p className="text-xl font-extrabold text-[#F59E0B]">
            {formatRupiah(totalReceivableSum)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#E2E8F0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-[#0F2747] text-white'
              : 'text-[#6B7280] hover:bg-white'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          <span>Pengeluaran ({expenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incomes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'incomes'
              ? 'bg-[#0F2747] text-white'
              : 'text-[#6B7280] hover:bg-white'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Pemasukan Lain ({incomes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receivables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'receivables'
              ? 'bg-[#0F2747] text-white'
              : 'text-[#6B7280] hover:bg-white'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Piutang Pelanggan ({receivables.length})</span>
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PENGELUARAN */}
      {activeTab === 'expenses' && (
        <div>
          {expenses.length === 0 ? (
            <EmptyState
              icon={ArrowDownCircle}
              title="Belum ada catatan pengeluaran"
              description="Catat biaya belanja bahan, sewa tempat, gas, kemasan, atau operasional toko lainnya agar pembukuan Anda rapi."
              actionLabel="+ Catat Pengeluaran Pertama"
              onAction={() => {
                setExpCategory(expenseCategories[0]?.id || '');
                setIsExpModalOpen(true);
              }}
            />
          ) : (
            <div className="space-y-3">
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#EF4444] flex items-center justify-center shrink-0">
                      <ArrowDownCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F2747]">
                          {e.categoryNameSnapshot}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          {formatDateTimeId(e.date)}
                        </span>
                      </div>
                      {e.notes && <p className="text-xs text-[#6B7280] mt-0.5">{e.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-[#EF4444]">
                      -{formatRupiah(e.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Hapus catatan pengeluaran ini?')) {
                          await expenseRepo.delete(e.id);
                          loadData();
                        }
                      }}
                      className="p-1 text-slate-300 hover:text-[#EF4444] rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEMASUKAN LAIN */}
      {activeTab === 'incomes' && (
        <div>
          {incomes.length === 0 ? (
            <EmptyState
              icon={ArrowUpCircle}
              title="Belum ada pemasukan lain"
              description="Catat tambahan dana, modal pemilik, pendapatan titipan, atau pemasukan non-kasir lainnya."
              actionLabel="+ Tambah Pemasukan Lain"
              onAction={() => setIsIncModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {incomes.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#22C55E] flex items-center justify-center shrink-0">
                      <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F2747]">
                          {inc.categoryNameSnapshot}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          {formatDateTimeId(inc.date)}
                        </span>
                      </div>
                      {inc.notes && <p className="text-xs text-[#6B7280] mt-0.5">{inc.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-[#22C55E]">
                      +{formatRupiah(inc.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Hapus pemasukan ini?')) {
                          await expenseRepo.deleteIncome(inc.id);
                          loadData();
                        }
                      }}
                      className="p-1 text-slate-300 hover:text-[#EF4444] rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PIUTANG PELANGGAN */}
      {activeTab === 'receivables' && (
        <div>
          {receivables.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Belum ada piutang pelanggan"
              description="Saat pelanggan membayar dengan metode 'Piutang' di layar kasir, daftarnya akan otomatis muncul di sini dan dapat dicatat pelunasan cicilannya."
            />
          ) : (
            <div className="space-y-3">
              {receivables.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#0F2747]">{rec.customerName}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          rec.status === 'lunas'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {rec.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Total: {formatRupiah(rec.totalDebt)} • Sudah bayar: {formatRupiah(rec.paidAmount)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold">Sisa Hutang:</span>
                      <span className="text-base font-extrabold text-[#F59E0B]">
                        {formatRupiah(rec.remainingDebt)}
                      </span>
                    </div>

                    {rec.status === 'belum_lunas' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPayingReceivable(rec);
                          setPayAmount(rec.remainingDebt.toString());
                          setIsPayModalOpen(true);
                        }}
                        className="pos-btn saku-gradient-bg text-white text-xs font-bold px-4 py-2 shadow-xs hover:opacity-95"
                      >
                        Bayar Cicilan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CATAT PENGELUARAN */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-[#0F2747] mb-1">Catat Pengeluaran</h2>
            <p className="text-xs text-[#6B7280] mb-4">
              Masukkan rincian pengeluaran operasional toko
            </p>

            {expError && (
              <div className="mb-4 p-3 bg-red-50 text-[#EF4444] text-xs font-semibold rounded-xl">
                {expError}
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Kategori Pengeluaran <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    required
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(true)}
                    className="pos-btn bg-white border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#1EB6E6]"
                  >
                    + Baru
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Nominal Pengeluaran (Rp) <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  step="500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-base font-extrabold text-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Tanggal</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Catatan Keterangan
                </label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Contoh: Beli minyak goreng 2 liter, plastik cup"
                  className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
                />
              </div>

              {/* Photo Upload with Compression */}
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Foto Struk / Nota (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-[#1EB6E6]"
                />
                {expPhoto && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ Foto berhasil dikompresi dan siap disimpan
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BUAT KATEGORI PENGELUARAN */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-[#0F2747] mb-1">Kategori Pengeluaran</h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Contoh: Bahan Baku, Sewa Tempat, Listrik &amp; Gas, Gaji, Kemasan
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori..."
                className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="pos-btn w-1/2 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn w-1/2 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT PEMASUKAN LAIN */}
      {isIncModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-[#0F2747] mb-1">Catat Pemasukan Lain</h2>
            <p className="text-xs text-[#6B7280] mb-4">
              Pemasukan selain penjualan kasir (misal: modal awal, bonus, titipan)
            </p>

            <form onSubmit={handleSaveIncome} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Nama / Sumber</label>
                <input
                  type="text"
                  required
                  value={incName}
                  onChange={(e) => setIncName(e.target.value)}
                  placeholder="Contoh: Tambahan Modal Usaha"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-base font-extrabold text-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Catatan</label>
                <input
                  type="text"
                  value={incNotes}
                  onChange={(e) => setIncNotes(e.target.value)}
                  placeholder="Keterangan opsional..."
                  className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIncModalOpen(false)}
                  className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Simpan Pemasukan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BAYAR CICILAN PIUTANG */}
      {isPayModalOpen && payingReceivable && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-[#0F2747] mb-1">Bayar Cicilan Piutang</h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Pelanggan: <span className="font-bold text-[#0F2747]">{payingReceivable.customerName}</span>
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-xs font-bold text-amber-900 flex justify-between">
              <span>Sisa Tagihan:</span>
              <span>{formatRupiah(payingReceivable.remainingDebt)}</span>
            </div>

            <form onSubmit={handlePayInstallment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Nominal Cicilan Dibayar (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={payingReceivable.remainingDebt}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-base font-extrabold text-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Metode Bayar</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer Bank / E-Wallet</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Catat Pelunasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
