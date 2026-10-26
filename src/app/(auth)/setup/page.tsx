'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
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
      if (val.length >= 4 && val.length === 6) {
        // Automatically switch to confirm
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
        receiptPrefix: prefix.trim().toUpperCase() || undefined,
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
    <div className="min-h-screen bg-[#F5F8FB] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E2E8F0]">
        {/* Header Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl saku-gradient-bg flex items-center justify-center p-0.5 shadow-xs">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <span className="font-extrabold text-lg saku-gradient-text tracking-tighter">SS</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F2747]">Setup SakuSales</h1>
            <p className="text-xs text-[#6B7280]">
              Langkah {step} dari 2 • {step === 1 ? 'Profil Usaha' : 'Keamanan PIN Owner'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#EF4444] text-xs font-semibold rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: INFORMASI TOKO */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <div>
              <label htmlFor="store-name-input" className="block text-xs font-bold text-[#0F2747] mb-1">
                Nama Toko / Usaha <span className="text-[#EF4444]">*</span>
              </label>
              <input
                id="store-name-input"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Keju Aroma Nyaman"
                className="w-full px-4 py-3 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
              />
              <span className="text-[11px] text-[#6B7280]">Nama ini akan tercetak di bagian atas struk</span>
            </div>

            <div>
              <label htmlFor="address-input" className="block text-xs font-bold text-[#0F2747] mb-1">
                Alamat Toko (Opsional)
              </label>
              <input
                id="address-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Diponegoro No. 12, Bandung"
                className="w-full px-4 py-3 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="phone-input" className="block text-xs font-bold text-[#0F2747] mb-1">
                Nomor WhatsApp / Telp (Opsional)
              </label>
              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-4 py-3 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="prefix-input" className="block text-xs font-bold text-[#0F2747] mb-1">
                Singkatan Nota (Prefiks)
              </label>
              <input
                id="prefix-input"
                type="text"
                maxLength={4}
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder={storeName ? storeName.slice(0, 2).toUpperCase() : 'SS'}
                className="w-full px-4 py-3 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white uppercase"
              />
              <span className="text-[11px] text-[#6B7280]">
                Contoh format nota: {prefix || 'SS'}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001
              </span>
            </div>

            <button
              id="setup-step1-btn"
              type="submit"
              className="pos-btn w-full saku-gradient-bg text-white font-bold py-3 text-sm shadow-md hover:opacity-95 mt-6"
            >
              Lanjutkan ke PIN Keamanan
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        )}

        {/* STEP 2: BUAT PIN OWNER */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#1EB6E6] mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[#0F2747]">
                {!isConfirming ? 'Buat PIN Owner (4–6 Angka)' : 'Masukkan Ulang PIN Konfirmasi'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {!isConfirming
                  ? 'PIN ini digunakan untuk masuk, ubah data, diskon, dan pembatalan'
                  : 'Pastikan angka sesuai dengan PIN yang dibuat sebelumnya'}
              </p>
            </div>

            {/* PIN Dots Indicator */}
            <div className="flex justify-center gap-3 my-3">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const currentVal = !isConfirming ? pin : confirmPin;
                const hasDigit = currentVal.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      hasDigit
                        ? 'saku-gradient-bg border-transparent scale-110'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex justify-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirming(false);
                  setConfirmPin('');
                }}
                className={`text-xs px-3 py-1 rounded-lg font-semibold ${
                  !isConfirming ? 'bg-[#0F2747] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                1. Buat PIN {pin.length > 0 && `(${pin.length}/6)`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pin.length >= 4) setIsConfirming(true);
                }}
                disabled={pin.length < 4}
                className={`text-xs px-3 py-1 rounded-lg font-semibold ${
                  isConfirming ? 'bg-[#0F2747] text-white' : 'text-slate-400 disabled:opacity-50'
                }`}
              >
                2. Konfirmasi {confirmPin.length > 0 && `(${confirmPin.length}/6)`}
              </button>
            </div>

            <PinKeypad
              value={!isConfirming ? pin : confirmPin}
              onChange={handlePinInput}
              maxLength={6}
              disabled={isSubmitting}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="pos-btn w-1/3 bg-[#F5F8FB] border border-[#E2E8F0] text-[#0F2747] text-xs font-semibold"
              >
                Kembali
              </button>

              <button
                id="setup-finish-btn"
                type="button"
                onClick={handleFinishSetup}
                disabled={isSubmitting || pin.length < 4 || confirmPin.length < 4}
                className="pos-btn flex-1 saku-gradient-bg text-white text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Menyimpan...' : 'Selesai & Buka Kasir'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
