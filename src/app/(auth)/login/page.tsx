'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Shield, AlertCircle, Store } from 'lucide-react';
import { userRepo } from '../../../lib/repositories/userRepo';
import { settingsRepo } from '../../../lib/repositories/settingsRepo';
import type { UserEntity, StoreSettingsEntity } from '../../../lib/db/schema';
import { useAuthStore } from '../../../stores/authStore';
import { PinKeypad } from '../../../components/shared/PinKeypad';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [users, setUsers] = useState<UserEntity[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);
  const [settings, setSettings] = useState<StoreSettingsEntity | null>(null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const isSetup = await settingsRepo.isSetupCompleted();
        if (!isSetup) {
          router.replace('/setup');
          return;
        }

        const storeSettings = await settingsRepo.get();
        if (storeSettings) setSettings(storeSettings);

        const allUsers = await userRepo.getAll();
        setUsers(allUsers);
        if (allUsers.length > 0) {
          setSelectedUser(allUsers[0]);
        }
      } catch (err) {
        console.error('Login load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handlePinChange = async (val: string) => {
    setPin(val);
    setErrorMsg('');

    if (val.length >= 4 && selectedUser) {
      if (val.length === 6) {
        await verifyAndLogin(val);
      }
    }
  };

  const verifyAndLogin = async (pinToTest: string) => {
    if (!selectedUser) return;
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const isValid = await userRepo.verifyUserPin(selectedUser, pinToTest);
      if (isValid) {
        login(selectedUser);
        router.replace('/kasir');
      } else {
        setErrorMsg('PIN yang Anda masukkan salah');
        setPin('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memverifikasi PIN');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F8FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1EB6E6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FB] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E2E8F0] text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl saku-gradient-bg flex items-center justify-center text-white mx-auto mb-3 shadow-md">
          <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center m-0.5">
            <span className="font-extrabold text-xl saku-gradient-text tracking-tighter">SS</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#0F2747]">
          {settings?.storeName || 'SakuSales'}
        </h1>
        <p className="text-xs text-[#6B7280] mb-5">
          Pilih akun dan masukkan PIN untuk mulai berjualan
        </p>

        {/* User Switcher */}
        {users.length > 1 && (
          <div className="flex gap-2 mb-4 p-1 bg-[#F5F8FB] rounded-xl border border-[#E2E8F0]">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setPin('');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-white text-[#0F2747] shadow-xs'
                      : 'text-slate-500 hover:text-[#0F2747]'
                  }`}
                >
                  {u.name} ({u.role})
                </button>
              );
            })}
          </div>
        )}

        {/* Current User Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5F8FB] border border-[#E2E8F0] rounded-full text-xs font-semibold text-[#0F2747] mb-4">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>Masuk sebagai: {selectedUser?.name}</span>
          <span className="text-[10px] text-[#1EB6E6] uppercase bg-cyan-50 px-1 rounded font-bold">
            {selectedUser?.role}
          </span>
        </div>

        {/* PIN Dots */}
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

        {/* Tactile Keypad */}
        <PinKeypad
          value={pin}
          onChange={handlePinChange}
          maxLength={6}
          disabled={isVerifying}
        />

        {pin.length >= 4 && (
          <button
            id="login-submit-btn"
            type="button"
            onClick={() => verifyAndLogin(pin)}
            disabled={isVerifying}
            className="pos-btn w-full saku-gradient-bg text-white text-sm font-bold shadow-md hover:opacity-95 mt-5"
          >
            {isVerifying ? 'Memverifikasi...' : 'Masuk ke Kasir'}
          </button>
        )}
      </div>
    </div>
  );
}
