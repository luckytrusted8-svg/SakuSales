'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar } from '../../components/shared/Sidebar';
import { NavMobile } from '../../components/shared/NavMobile';
import { LockOverlay } from '../../components/shared/LockOverlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, recordActivity } = useAuthStore();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
    }
  }, [currentUser, router]);

  // Global inactivity tracking
  useEffect(() => {
    const handleActivity = () => {
      recordActivity();
    };

    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    // Check interval every 10 seconds for auto-lock
    const interval = setInterval(() => {
      recordActivity();
    }, 10000);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [recordActivity]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F5F8FB]">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-6 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <NavMobile />

      {/* Auto-Lock Screen Overlay */}
      <LockOverlay />

      {/* Hidden Thermal Print Area (used exclusively during browser printing) */}
      <div id="thermal-print-area" className="hidden" />
    </div>
  );
}
