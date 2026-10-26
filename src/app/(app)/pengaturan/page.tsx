'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Printer,
  Shield,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserPlus,
  Trash2,
  Info,
} from 'lucide-react';
import { db } from '../../../lib/db';
import { settingsRepo } from '../../../lib/repositories/settingsRepo';
import { userRepo } from '../../../lib/repositories/userRepo';
import { resetDatabaseAll, resetTransactionsOnly } from '../../../lib/db/reset';
import type { StoreSettingsEntity, UserEntity } from '../../../lib/db/schema';
import { useAuthStore } from '../../../stores/authStore';
import { toLocalDateString } from '../../../lib/format/date';

export default function PengaturanPage() {
  const { currentUser, logout, setAutoLockMinutes } = useAuthStore();
  const isOwner = currentUser?.role === 'owner';

  const [settings, setSettings] = useState<StoreSettingsEntity | null>(null);
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Store Settings Form
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [prefix, setPrefix] = useState('SS');
  const [enableHpp, setEnableHpp] = useState(false);
  const [lockMinutes, setLockMinutes] = useState(5);

  // New Cashier User Form
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [cashierName, setCashierName] = useState('');
  const [cashierPin, setCashierPin] = useState('');

  // Two-step Reset Confirmation
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetType, setResetType] = useState<'transactions' | 'all'>('transactions');
  const [resetConfirmText, setResetConfirmText] = useState('');

  const loadData = async () => {
    try {
      const s = await settingsRepo.get();
      if (s) {
        setSettings(s);
        setStoreName(s.storeName);
        setAddress(s.address || '');
        setPhone(s.phone || '');
        setReceiptFooter(s.receiptFooter || '');
        setPaperSize(s.receiptPaperSize);
        setPrefix(s.receiptPrefix);
        setEnableHpp(s.enableHpp);
        setLockMinutes(s.autoLockMinutes || 5);
      }

      const allUsers = await userRepo.getAll();
      setUsers(allUsers);
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      alert('Nama toko wajib diisi');
      return;
    }

    try {
      await settingsRepo.upsert({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receiptFooter: receiptFooter.trim(),
        receiptPaperSize: paperSize,
        receiptPrefix: prefix.trim().toUpperCase(),
        enableHpp,
        autoLockMinutes: lockMinutes,
      });

      setAutoLockMinutes(lockMinutes);
      setNotice({ type: 'success', message: 'Pengaturan toko berhasil disimpan' });
      loadData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Gagal menyimpan pengaturan' });
    }
  };

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierName.trim() || cashierPin.length < 4) {
      alert('Nama kasir dan PIN (4-6 angka) wajib diisi');
      return;
    }

    try {
      await userRepo.create({
        username: cashierName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: cashierName.trim(),
        role: 'kasir',
        pin: cashierPin,
      });

      setNotice({ type: 'success', message: `Kasir "${cashierName}" berhasil ditambahkan` });
      setIsAddUserOpen(false);
      setCashierName('');
      setCashierPin('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan kasir');
    }
  };

  // 1-Click JSON Backup Export
  const handleExportBackup = async () => {
    try {
      const backupData = {
        app: 'SakuSales',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        storeSettings: await db.storeSettings.toArray(),
        users: await db.users.toArray(),
        categories: await db.categories.toArray(),
        products: await db.products.toArray(),
        addonVariants: await db.addonVariants.toArray(),
        ingredients: await db.ingredients.toArray(),
        recipeLines: await db.recipeLines.toArray(),
        customers: await db.customers.toArray(),
        transactions: await db.transactions.toArray(),
        transactionItems: await db.transactionItems.toArray(),
        transactionItemAddons: await db.transactionItemAddons.toArray(),
        payments: await db.payments.toArray(),
        receivableRecords: await db.receivableRecords.toArray(),
        expenses: await db.expenses.toArray(),
        otherIncomes: await db.otherIncomes.toArray(),
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SakuSales-Backup-${toLocalDateString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setNotice({ type: 'success', message: 'File backup JSON berhasil diunduh ke perangkat' });
    } catch (err: any) {
      alert('Gagal mengekspor backup: ' + err.message);
    }
  };

  // Restore JSON Backup Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.app !== 'SakuSales') {
          throw new Error('Format file bukan backup resmi SakuSales');
        }

        const confirmRestore = window.confirm(
          `Restore data dari backup tanggal ${json.exportedAt}? Data saat ini akan digantikan dengan data backup.`
        );
        if (!confirmRestore) return;

        await db.transaction(
          'rw',
          [
            db.storeSettings,
            db.users,
            db.categories,
            db.products,
            db.addonVariants,
            db.ingredients,
            db.recipeLines,
            db.customers,
            db.transactions,
            db.transactionItems,
            db.transactionItemAddons,
            db.payments,
            db.receivableRecords,
            db.expenses,
            db.otherIncomes,
          ],
          async () => {
            if (json.storeSettings) await db.storeSettings.bulkPut(json.storeSettings);
            if (json.users) await db.users.bulkPut(json.users);
            if (json.categories) await db.categories.bulkPut(json.categories);
            if (json.products) await db.products.bulkPut(json.products);
            if (json.addonVariants) await db.addonVariants.bulkPut(json.addonVariants);
            if (json.ingredients) await db.ingredients.bulkPut(json.ingredients);
            if (json.recipeLines) await db.recipeLines.bulkPut(json.recipeLines);
            if (json.customers) await db.customers.bulkPut(json.customers);
            if (json.transactions) await db.transactions.bulkPut(json.transactions);
            if (json.transactionItems) await db.transactionItems.bulkPut(json.transactionItems);
            if (json.transactionItemAddons) await db.transactionItemAddons.bulkPut(json.transactionItemAddons);
            if (json.payments) await db.payments.bulkPut(json.payments);
            if (json.receivableRecords) await db.receivableRecords.bulkPut(json.receivableRecords);
            if (json.expenses) await db.expenses.bulkPut(json.expenses);
            if (json.otherIncomes) await db.otherIncomes.bulkPut(json.otherIncomes);
          }
        );

        setNotice({ type: 'success', message: 'Data berhasil dipulihkan dari file backup' });
        loadData();
      } catch (err: any) {
        alert('Gagal memproses file backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Two-Step Reset Handler
  const handleExecuteReset = async () => {
    if (resetConfirmText !== 'RESET-DATA') {
      alert('Teks konfirmasi salah. Harap ketik "RESET-DATA" persis sama.');
      return;
    }

    try {
      if (resetType === 'all') {
        await resetDatabaseAll();
        setIsResetModalOpen(false);
        alert('Seluruh data berhasil direset. Aplikasi akan kembali ke wizard setup.');
        logout();
        window.location.href = '/setup';
      } else {
        await resetTransactionsOnly();
        setIsResetModalOpen(false);
        setNotice({
          type: 'success',
          message: 'Data riwayat transaksi dan pembukuan berhasil dikosongkan',
        });
        loadData();
      }
    } catch (err: any) {
      alert('Gagal mereset data: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F2747]">Pengaturan &amp; Data</h1>
        <p className="text-xs text-[#6B7280]">
          Kelola profil toko, printer struk, backup data berkala, dan keamanan
        </p>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
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

      {/* iOS Safari Weekly Backup Reminder Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-bold">Pengingat Penting Backup Mingguan</p>
          <p className="mt-0.5 leading-relaxed">
            Semua data tersimpan aman di HP Anda secara offline. Khusus pengguna iPhone/iPad (Safari),
            sistem iOS dapat membersihkan penyimpanan lokal jika aplikasi tidak dibuka lama.
            Rutin unduh <strong>Backup JSON</strong> seminggu sekali ke Google Drive atau memori HP.
          </p>
        </div>
      </div>

      {/* 1. INFORMASI TOKO & STRUK */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#0F2747] mb-1 flex items-center gap-2">
          <Store className="w-5 h-5 text-[#1EB6E6]" />
          Profil Toko &amp; Struk
        </h2>
        <p className="text-xs text-[#6B7280] mb-5">
          Informasi ini akan tercetak pada struk belanja pelanggan
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F2747] mb-1">
                Nama Toko <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F2747] mb-1">
                Nomor WA / Telp Toko
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F2747] mb-1">Alamat Toko</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Diponegoro No. 12"
              className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F2747] mb-1">
                Ukuran Kertas Struk
              </label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
              >
                <option value="58mm">58mm (Printer Mini / Standar UMKM)</option>
                <option value="80mm">80mm (Printer Lebar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F2747] mb-1">
                Prefiks Nomor Nota
              </label>
              <input
                type="text"
                maxLength={4}
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="SS"
                className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747] uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F2747] mb-1">
              Pesan Penutup Struk
            </label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Contoh: Terima kasih atas kunjungan Anda!"
              className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
            />
          </div>

          {/* Module Toggles */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0F2747]">
              <input
                type="checkbox"
                checked={enableHpp}
                onChange={(e) => setEnableHpp(e.target.checked)}
                className="w-4 h-4 rounded text-[#1EB6E6] focus:ring-0"
              />
              <span>Aktifkan Modul Resep &amp; HPP Laba Kotor</span>
            </label>

            <div className="flex items-center gap-2 text-xs font-bold text-[#0F2747]">
              <span>Kunci Layar Otomatis:</span>
              <select
                value={lockMinutes}
                onChange={(e) => setLockMinutes(parseInt(e.target.value, 10))}
                className="px-2 py-1 bg-[#F5F8FB] border border-[#E2E8F0] rounded-lg text-xs"
              >
                <option value={2}>2 Menit</option>
                <option value={5}>5 Menit (Standar)</option>
                <option value={10}>10 Menit</option>
                <option value={30}>30 Menit</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="pos-btn saku-gradient-bg text-white px-6 py-2.5 text-xs font-bold shadow-xs hover:opacity-95"
          >
            Simpan Pengaturan Toko
          </button>
        </form>
      </div>

      {/* 2. BACKUP & RESTORE DATA */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#0F2747] mb-1 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#22C55E]" />
          Backup &amp; Restore Data (Offline-First)
        </h2>
        <p className="text-xs text-[#6B7280] mb-4">
          Ekspor seluruh data jualan ke satu file JSON atau pulihkan data dari file yang sudah ada
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="pos-btn saku-gradient-bg text-white px-5 py-2.5 text-xs font-bold shadow-xs hover:opacity-95"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download Backup JSON
          </button>

          <label className="pos-btn bg-white border border-[#E2E8F0] text-[#0F2747] hover:bg-[#F5F8FB] px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer">
            <Upload className="w-4 h-4 mr-1.5 text-[#1EB6E6]" />
            Pulihkan dari File Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3. MANAJEMEN PENGGUNA (OWNER ONLY) */}
      {isOwner && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F2747] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1EB6E6]" />
                Pengguna &amp; Hak Akses
              </h2>
              <p className="text-xs text-[#6B7280]">
                Owner (akses penuh) dan Kasir (layar kasir &amp; riwayat hari ini saja)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="pos-btn bg-[#F5F8FB] border border-[#E2E8F0] hover:bg-white text-xs font-bold text-[#0F2747] px-3.5 py-2"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              + Kasir Baru
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-[#0F2747]">{u.name}</p>
                  <span className="text-[10px] uppercase font-bold text-[#1EB6E6] bg-cyan-50 px-1.5 py-0.5 rounded">
                    {u.role}
                  </span>
                </div>

                {u.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Hapus akun kasir "${u.name}"?`)) {
                        await userRepo.delete(u.id);
                        loadData();
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-[#EF4444]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ZONA RESET DATA (OWNER ONLY, 2-STEP CONFIRMATION) */}
      {isOwner && (
        <div className="bg-white rounded-3xl border border-red-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-[#EF4444] mb-1 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            Zona Bahaya: Reset Database
          </h2>
          <p className="text-xs text-[#6B7280] mb-4">
            Kaji ulang sebelum menghapus data. Tindakan ini memerlukan konfirmasi keamanan 2-langkah.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setResetType('transactions');
                setResetConfirmText('');
                setIsResetModalOpen(true);
              }}
              className="pos-btn bg-red-50 text-[#EF4444] hover:bg-red-100 border border-red-200 px-4 py-2.5 text-xs font-bold"
            >
              Reset Riwayat Transaksi Saja
            </button>

            <button
              type="button"
              onClick={() => {
                setResetType('all');
                setResetConfirmText('');
                setIsResetModalOpen(true);
              }}
              className="pos-btn bg-[#EF4444] text-white hover:bg-red-600 px-4 py-2.5 text-xs font-bold shadow-xs"
            >
              Hard Reset Seluruh Data (Mulai dari Nol)
            </button>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH KASIR */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-[#0F2747] mb-1">Tambah Kasir Baru</h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Kasir hanya memiliki akses ke layar kasir dan riwayat transaksi hari ini
            </p>

            <form onSubmit={handleAddCashier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Nama Kasir</label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="Contoh: Rina, Budi"
                  className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  PIN Kasir (4–6 Angka)
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-extrabold text-[#0F2747] tracking-widest text-center"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Tambah Kasir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TWO-STEP RESET CONFIRMATION */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-red-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EF4444] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-[#0F2747]">
              Konfirmasi Dua Langkah: {resetType === 'all' ? 'Hard Reset Data' : 'Reset Transaksi'}
            </h3>
            <p className="text-xs text-[#6B7280] my-2">
              {resetType === 'all'
                ? 'Semua produk, varian, bahan baku, transaksi, dan akun akan dihapus permanen.'
                : 'Semua riwayat transaksi dan pengeluaran akan dihapus. Master produk tetap ada.'}
            </p>

            <div className="my-4 text-left">
              <label className="block text-xs font-bold text-[#0F2747] mb-1">
                Ketik <span className="text-[#EF4444] font-mono">RESET-DATA</span> untuk melanjutkan:
              </label>
              <input
                type="text"
                autoFocus
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET-DATA"
                className="w-full px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-mono font-bold text-center text-[#EF4444]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetConfirmText !== 'RESET-DATA'}
                className="pos-btn flex-1 bg-[#EF4444] text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 shadow-xs"
              >
                Konfirmasi Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
