'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Shield, AlertCircle, Store, Lock, KeyRound } from 'lucide-react';
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
        setErrorMsg('PIN yang Anda masukkan tidak sesuai');
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
      <div className="min-h-screen bg-[#F5F8FB] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#1EB6E6] border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-[#6B7280]">Memuat sesi kasir...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FB] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm saku-card p-6 sm:p-8 text-center border border-[#E2E8F0] shadow-lg">
        {/* Brand Icon Emblem */}
        <div className="w-14 h-14 rounded-2xl saku-gradient-bg flex items-center justify-center mx-auto mb-3 shadow-md p-0.5">
          <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
            <span className="font-extrabold text-xl saku-gradient-text tracking-tighter">SS</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-[#0F2747]">
          {settings?.storeName || 'SakuSales POS'}
        </h1>
        <p className="text-xs text-[#6B7280] mb-5 mt-0.5">
          Pilih akun kasir dan masukkan PIN keamanan
        </p>

        {/* User Switcher (Multi-user support) */}
        {users.length > 1 && (
          <div className="flex gap-2 mb-4 p-1 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
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
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-white text-[#0F2747] shadow-xs border border-[#E2E8F0]'
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-xs font-semibold text-[#0F2747] mb-5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>Akun: <strong>{selectedUser?.name}</strong></span>
          <span className="text-[10px] text-[#1EB6E6] uppercase bg-cyan-50 px-1.5 py-0.5 rounded-md font-bold">
            {selectedUser?.role}
          </span>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-5">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasDigit = pin.length > idx;
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

        {errorMsg && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#EF4444] font-semibold mb-4 bg-red-50 py-2 px-3 rounded-xl border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
            className="pos-btn saku-btn-primary w-full text-white text-sm font-bold mt-5"
          >
            {isVerifying ? 'Memverifikasi...' : 'Buka Kasir'}
          </button>
        )}
      </div>
    </div>
  );
}
