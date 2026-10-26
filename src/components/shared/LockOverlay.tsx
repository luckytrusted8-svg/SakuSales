'use client';

import React, { useState } from 'react';
import { Lock, LogOut, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { PinKeypad } from './PinKeypad';

export const LockOverlay: React.FC = () => {
  const { isLocked, currentUser, unlockWithPin, logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isLocked || !currentUser) return null;

  const handlePinChange = async (newPin: string) => {
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length >= 4 && newPin.length <= 6) {
      setIsVerifying(true);
      const ok = await unlockWithPin(newPin);
      setIsVerifying(false);

      if (ok) {
        setPin('');
      } else if (newPin.length === 6) {
        setErrorMsg('PIN salah, silakan coba lagi');
        setPin('');
      }
    }
  };

  const handleManualUnlock = async () => {
    if (!pin) return;
    setIsVerifying(true);
    const ok = await unlockWithPin(pin);
    setIsVerifying(false);
    if (!ok) {
      setErrorMsg('PIN salah, silakan coba lagi');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2747]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center border border-slate-100">
        <div className="w-14 h-14 rounded-2xl saku-gradient-bg flex items-center justify-center text-white mx-auto mb-3 shadow-md">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-[#0F2747]">SakuSales Terkunci</h2>
        <p className="text-xs text-[#6B7280] mb-5">
          Masukkan PIN <span className="font-semibold text-[#0F2747]">{currentUser.name}</span> untuk melanjutkan transaksi
        </p>

        {/* PIN Dots Display */}
        <div className="flex justify-center gap-3 mb-4">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasDigit = pin.length > idx;
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

        {errorMsg && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#EF4444] font-semibold mb-4 bg-red-50 py-1.5 px-3 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mb-4">
          <PinKeypad value={pin} onChange={handlePinChange} maxLength={6} disabled={isVerifying} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-500 hover:text-[#EF4444] font-semibold flex items-center gap-1 py-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Ganti Akun
          </button>

          {pin.length >= 4 && (
            <button
              type="button"
              onClick={handleManualUnlock}
              disabled={isVerifying}
              className="pos-btn saku-gradient-bg text-white text-xs px-4 py-2 font-bold shadow-xs hover:opacity-95"
            >
              Buka Kunci
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
