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
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

export const NavMobile: React.FC = () => {
  const pathname = usePathname();
  const { currentUser } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const totalCartQty = cartItems.reduce((sum, it) => sum + it.qty, 0);

  const isOwner = currentUser?.role === 'owner';

  const navItems = [
    {
      label: 'Kasir',
      href: '/kasir',
      icon: ShoppingBag,
      badge: totalCartQty > 0 ? totalCartQty : undefined,
    },
    {
      label: 'Transaksi',
      href: '/transaksi',
      icon: ReceiptText,
    },
    ...(isOwner
      ? [
          {
            label: 'Katalog',
            href: '/katalog',
            icon: Boxes,
          },
          {
            label: 'Keuangan',
            href: '/keuangan/pengeluaran',
            icon: Wallet,
          },
          {
            label: 'Laporan',
            href: '/laporan',
            icon: BarChart3,
          },
          {
            label: 'Pengaturan',
            href: '/pengaturan',
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E2E8F0] shadow-lg px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
              isActive
                ? 'text-[#0F2747] font-bold'
                : 'text-[#6B7280] font-medium hover:text-[#0F2747]'
            }`}
          >
            <div className="relative">
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'saku-gradient-bg text-white shadow-xs' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
