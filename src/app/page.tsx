'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { settingsRepo } from '../lib/repositories/settingsRepo';
import { useAuthStore } from '../stores/authStore';

export default function RootPage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkInit() {
      try {
        const isSetup = await settingsRepo.isSetupCompleted();
        if (!isSetup) {
          router.replace('/setup');
          return;
        }

        if (!currentUser) {
          router.replace('/login');
          return;
        }

        router.replace('/kasir');
      } catch (err) {
        console.error('Initialization check error:', err);
        router.replace('/setup');
      } finally {
        setLoading(false);
      }
    }

    checkInit();
  }, [currentUser, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F8FB] p-4">
      <div className="w-16 h-16 rounded-2xl saku-gradient-bg flex items-center justify-center p-0.5 shadow-md mb-4 animate-pulse">
        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
          <span className="font-extrabold text-xl saku-gradient-text tracking-tighter">SS</span>
        </div>
      </div>
      <h1 className="text-xl font-bold text-[#0F2747]">SakuSales</h1>
      <p className="text-xs text-[#6B7280] mt-1 font-medium">Memuat sistem kasir...</p>
    </div>
  );
}
