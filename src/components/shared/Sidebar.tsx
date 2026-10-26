'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  ReceiptText,
  Boxes,
  Wallet,
  BarChart3,
  Settings,
  Lock,
  LogOut,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, lock, logout } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const totalCartQty = cartItems.reduce((sum, it) => sum + it.qty, 0);

  const isOwner = currentUser?.role === 'owner';

  const menuItems = [
    {
      label: 'Kasir POS',
      href: '/kasir',
      icon: ShoppingBag,
      badge: totalCartQty > 0 ? totalCartQty : undefined,
    },
    {
      label: 'Riwayat Transaksi',
      href: '/transaksi',
      icon: ReceiptText,
    },
    ...(isOwner
      ? [
          {
            label: 'Katalog & Varian',
            href: '/katalog',
            icon: Boxes,
          },
          {
            label: 'Keuangan & Piutang',
            href: '/keuangan/pengeluaran',
            icon: Wallet,
          },
          {
            label: 'Laporan & Analitik',
            href: '/laporan',
            icon: BarChart3,
          },
          {
            label: 'Pengaturan & Backup',
            href: '/pengaturan',
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E2E8F0] min-h-screen p-4 justify-between shrink-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl saku-gradient-bg flex items-center justify-center p-0.5 shadow-xs">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-base saku-gradient-text tracking-tighter">
                SS
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F2747] tracking-tight">SakuSales</h1>
            <p className="text-[11px] text-[#6B7280] font-medium leading-none">
              Jualan &amp; Catat Cepat
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pos-btn w-full justify-between px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'saku-gradient-bg text-white shadow-xs'
                    : 'text-[#0F2747] hover:bg-[#F5F8FB]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white text-[#0F2747]'
                        : 'bg-[#EF4444] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & Lock control */}
      <div className="border-t border-[#E2E8F0] pt-4 mt-6">
        <div className="flex items-center justify-between px-2 py-2 mb-2 bg-[#F5F8FB] rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0F2747]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F2747] truncate max-w-[100px]">
                {currentUser?.name || 'Kasir'}
              </p>
              <span className="text-[10px] uppercase font-semibold text-[#1EB6E6] bg-cyan-50 px-1.5 py-0.2 rounded">
                {currentUser?.role || 'kasir'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={lock}
            title="Kunci Layar (Lock)"
            className="p-1.5 text-slate-500 hover:text-[#0F2747] hover:bg-white rounded-lg transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          className="pos-btn w-full text-xs font-semibold text-slate-500 hover:text-[#EF4444] hover:bg-red-50 py-2"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Keluar Sesi
        </button>
      </div>
    </aside>
  );
};
