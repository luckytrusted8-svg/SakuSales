'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, CheckCircle2, ArrowRight, MapPin, Phone, Hash, Receipt, Sparkles } from 'lucide-react';
import { settingsRepo } from '../../../lib/repositories/settingsRepo';
import { userRepo } from '../../../lib/repositories/userRepo';
import { useAuthStore } from '../../../stores/authStore';
import { PinKeypad } from '../../../components/shared/PinKeypad';

export default function SetupWizardPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [prefix, setPrefix] = useState('');

  // PIN setup
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanPrefix = (prefix.trim().toUpperCase() || (storeName.trim() ? storeName.trim().slice(0, 2).toUpperCase() : 'SS')).slice(0, 4);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setErrorMsg('Nama toko wajib diisi');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handlePinInput = (val: string) => {
    setErrorMsg('');
    if (!isConfirming) {
      setPin(val);
      if (val.length === 6) {
        setTimeout(() => setIsConfirming(true), 150);
      }
    } else {
      setConfirmPin(val);
    }
  };

  const handleFinishSetup = async () => {
    if (pin.length < 4 || pin.length > 6) {
      setErrorMsg('PIN harus terdiri dari 4 sampai 6 angka');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('Konfirmasi PIN tidak cocok, silakan ulangi');
      setConfirmPin('');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Create Owner User
      const owner = await userRepo.create({
        username: 'owner',
        name: 'Owner Toko',
        role: 'owner',
        pin,
      });

      // 2. Create Store Settings
      await settingsRepo.upsert({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receiptPrefix: cleanPrefix,
        autoLockMinutes: 5,
        enableHpp: false,
      });

      // 3. Log in owner session
      login(owner);

      // 4. Redirect to cashier
      router.replace('/kasir');
    } catch (err: any) {
      console.error('Setup error:', err);
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan awal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FB] flex flex-col justify-center items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-4xl">
        {/* Top Brand Pill & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-xs mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7BE07A] animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-[#0F2747]">SakuSales PWA POS</span>
            <span className="text-[11px] text-[#6B7280]">• Offline-First</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2747] tracking-tight">
            Selamat Datang di SakuSales
          </h1>
          <p className="text-sm text-[#6B7280] mt-1 max-w-md mx-auto">
            Atur profil usaha jajanan atau dagangan Anda dalam 1 menit. Tanpa kuota, data tersimpan 100% di perangkat ini.
          </p>
        </div>

        {/* Step Progress Pill Indicator */}
        <div className="max-w-md mx-auto mb-6 flex items-center justify-between p-1.5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 1 ? 'saku-gradient-bg text-white shadow-xs' : 'text-[#0F2747] bg-[#F8FAFC]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>1. Profil Toko</span>
          </div>
          <div className="w-3 flex justify-center text-[#94A3B8]">
            <ArrowRight className="w-3 h-3" />
          </div>
          <div
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 2 ? 'saku-gradient-bg text-white shadow-xs' : 'text-[#6B7280]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. PIN Owner</span>
          </div>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto mb-6 p-3.5 bg-red-50 border border-red-200 text-[#EF4444] text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Informasi Toko + Live Receipt Preview */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1EB6E6] flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F2747]">Informasi Usaha</h2>
                  <p className="text-xs text-[#6B7280]">Data ini akan dicetak otomatis di header struk kasir.</p>
                </div>
              </div>

              <form onSubmit={handleStep1Next} className="space-y-4">
                <div>
                  <label htmlFor="store-name-input" className="block text-xs font-bold text-[#0F2747] mb-1.5">
                    Nama Toko / Usaha <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="store-name-input"
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Contoh: Keju Aroma Mas Lucky"
                      className="saku-input"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Nama dagangan Anda yang akan dilihat oleh pembeli di struk.
                  </span>
                </div>

                <div>
                  <label htmlFor="address-input" className="block text-xs font-bold text-[#0F2747] mb-1.5">
                    Alamat / Lokasi Stand (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      id="address-input"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Food Court Lantai 1 / Depan Indomaret"
                      className="saku-input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone-input" className="block text-xs font-bold text-[#0F2747] mb-1.5">
                    No. WhatsApp Toko (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="saku-input"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="prefix-input" className="block text-xs font-bold text-[#0F2747] mb-1.5">
                    Prefiks Singkatan Nota (2–4 Huruf)
                  </label>
                  <div className="relative">
                    <input
                      id="prefix-input"
                      type="text"
                      maxLength={4}
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                      placeholder={cleanPrefix}
                      className="saku-input font-bold tracking-wider uppercase"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Format nomor transaksi kasir:{' '}
                    <strong className="text-[#0F2747] font-semibold">{cleanPrefix}-20261026-0001</strong>
                  </span>
                </div>

                <div className="pt-3">
                  <button
                    id="setup-step1-btn"
                    type="submit"
                    className="pos-btn saku-btn-primary w-full text-white font-bold py-3.5 text-sm"
                  >
                    <span>Lanjutkan ke PIN Keamanan</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </form>
            </div>

            {/* Live Receipt Preview Column */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#0F2747] flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#1EB6E6]" />
                  Pratinjau Struk Cetak
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[#6B7280]">
                  58mm Thermal
                </span>
              </div>

              {/* Realistic Thermal Receipt Mockup */}
              <div className="w-full max-w-[280px] bg-[#FAFBFD] p-5 rounded-2xl border-2 border-dashed border-[#CBD5E1] font-mono text-[11px] text-slate-800 shadow-inner">
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                  <p className="font-extrabold text-xs text-[#0F2747] uppercase tracking-wide">
                    {storeName.trim() || 'NAMA USAHA ANDA'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {address.trim() || 'Alamat Lokasi Stand Toko'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    WA: {phone.trim() || '08xxxxxxxxxx'}
                  </p>
                </div>

                <div className="space-y-1 mb-3 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>No: {cleanPrefix}-20261026-0001</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir: Owner Toko</span>
                    <span>26/10/26 16:00</span>
                  </div>
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-2.5 my-2 space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>1x Keju Aroma Glaze</span>
                    <span>15.000</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-2">
                    + Coklat Crunchy (+2.000)
                  </div>
                </div>

                <div className="space-y-1 pt-1 font-bold text-xs">
                  <div className="flex justify-between">
                    <span>TOTAL</span>
                    <span className="text-[#0F2747]">Rp 17.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-normal text-slate-600">
                    <span>TUNAI</span>
                    <span>Rp 20.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-normal text-slate-600">
                    <span>KEMBALI</span>
                    <span>Rp 3.000</span>
                  </div>
                </div>

                <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-3 text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700">Terima Kasih!</p>
                  <p>Struk resmi SakuSales POS</p>
                </div>
              </div>

              <p className="text-[11px] text-[#6B7280] text-center mt-4">
                Tampilan struk thermal otomatis menyesuaikan printer Bluetooth 58mm atau 80mm Anda.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Buat PIN Owner */}
        {step === 2 && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl saku-gradient-bg flex items-center justify-center text-white mx-auto mb-3 shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0F2747]">
                {!isConfirming ? 'Buat PIN Keamanan Owner' : 'Konfirmasi PIN Sekali Lagi'}
              </h2>
              <p className="text-xs text-[#6B7280] mt-1 max-w-xs mx-auto">
                {!isConfirming
                  ? 'PIN 4–6 digit ini melindungi akses laporan keuntungan, pembatalan struk, dan diskon.'
                  : 'Ketik ulang nomor PIN yang sama untuk memastikan tidak ada kesalahan ketik.'}
              </p>
            </div>

            {/* PIN Step Switcher Badge */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setIsConfirming(false);
                  setConfirmPin('');
                }}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  !isConfirming
                    ? 'bg-[#0F2747] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                1. PIN Baru {pin.length > 0 && `(${pin.length}/6)`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pin.length >= 4) setIsConfirming(true);
                }}
                disabled={pin.length < 4}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  isConfirming
                    ? 'bg-[#0F2747] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 disabled:opacity-50'
                }`}
              >
                2. Konfirmasi {confirmPin.length > 0 && `(${confirmPin.length}/6)`}
              </button>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-3 my-5">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const currentVal = !isConfirming ? pin : confirmPin;
                const hasDigit = currentVal.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      hasDigit
                        ? 'saku-gradient-bg border-transparent scale-110 shadow-xs'
                        : 'border-slate-300 bg-slate-100'
                    }`}
                  />
                );
              })}
            </div>

            {/* Tactile Keypad */}
            <PinKeypad
              value={!isConfirming ? pin : confirmPin}
              onChange={handlePinInput}
              maxLength={6}
              disabled={isSubmitting}
            />

            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="pos-btn saku-btn-secondary w-1/3 text-xs font-bold"
              >
                Kembali
              </button>

              <button
                id="setup-finish-btn"
                type="button"
                onClick={handleFinishSetup}
                disabled={isSubmitting || pin.length < 4 || confirmPin.length < 4}
                className="pos-btn saku-btn-primary flex-1 text-white text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Menyimpan...' : 'Buka Kasir Sekarang'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
