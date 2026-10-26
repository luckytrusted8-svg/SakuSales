'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Share2,
  Calendar,
  Layers,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { db } from '../../../lib/db';
import { settingsRepo } from '../../../lib/repositories/settingsRepo';
import type {
  TransactionEntity,
  TransactionItemEntity,
  TransactionItemAddonEntity,
  ExpenseEntity,
  OtherIncomeEntity,
  StoreSettingsEntity,
} from '../../../lib/db/schema';
import { formatRupiah } from '../../../lib/format/rupiah';
import { formatDateTimeId, formatDateId, toLocalDateString } from '../../../lib/format/date';
import { exportToExcel } from '../../../lib/export/excel';
import { exportToPdf } from '../../../lib/export/pdf';
import { EmptyState } from '../../../components/shared/EmptyState';

const CHART_COLORS = ['#1EB6E6', '#7BE07A', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function LaporanPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [settings, setSettings] = useState<StoreSettingsEntity | null>(null);
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [items, setItems] = useState<TransactionItemEntity[]>([]);
  const [addons, setAddons] = useState<TransactionItemAddonEntity[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntity[]>([]);
  const [incomes, setIncomes] = useState<OtherIncomeEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const storeSettings = await settingsRepo.get();
      if (storeSettings) setSettings(storeSettings);

      const allTx = await db.transactions.toArray();
      const allItems = await db.transactionItems.toArray();
      const allAddons = await db.transactionItemAddons.toArray();
      const allExp = await db.expenses.toArray();
      const allInc = await db.otherIncomes.toArray();

      setTransactions(allTx);
      setItems(allItems);
      setAddons(allAddons);
      setExpenses(allExp);
      setIncomes(allInc);
    } catch (err) {
      console.error('Load laporan error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter based on period
  const now = new Date();
  const todayDateOnly = toLocalDateString(now);

  const filterByPeriod = (dateOnlyStr: string) => {
    if (period === 'today') {
      return dateOnlyStr === todayDateOnly;
    }
    if (period === 'week') {
      const txDate = new Date(dateOnlyStr);
      const diffTime = Math.abs(now.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (period === 'month') {
      return dateOnlyStr.startsWith(todayDateOnly.slice(0, 7));
    }
    return true;
  };

  // Only count non-canceled transactions
  const activeTx = transactions.filter(
    (t) => t.status !== 'batal' && filterByPeriod(t.dateOnly)
  );

  const periodExpenses = expenses.filter((e) => filterByPeriod(e.dateOnly));
  const periodIncomes = incomes.filter((i) => filterByPeriod(i.dateOnly));

  // Metrics
  const totalTurnover = activeTx.reduce((sum, t) => sum + t.grandTotal, 0);
  const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOtherIncome = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
  const netCash = totalTurnover + totalOtherIncome - totalExpense;
  const avgPerTx = activeTx.length > 0 ? Math.round(totalTurnover / activeTx.length) : 0;

  // Active items for period
  const activeTxIds = new Set(activeTx.map((t) => t.id));
  const periodItems = items.filter((it) => activeTxIds.has(it.transactionId));

  // Product sales aggregation
  const productAgg: Record<string, { name: string; qty: number; turnover: number; hpp: number }> = {};
  for (const it of periodItems) {
    if (!productAgg[it.productNameSnapshot]) {
      productAgg[it.productNameSnapshot] = {
        name: it.productNameSnapshot,
        qty: 0,
        turnover: 0,
        hpp: 0,
      };
    }
    productAgg[it.productNameSnapshot].qty += it.qty;
    productAgg[it.productNameSnapshot].turnover += it.subtotal;
    productAgg[it.productNameSnapshot].hpp += (it.hppSnapshot || 0) * it.qty;
  }

  const topProducts = Object.values(productAgg).sort((a, b) => b.qty - a.qty);

  // Hourly chart data (for Today view)
  const hourlyData: Record<number, number> = {};
  for (let i = 8; i <= 22; i++) {
    hourlyData[i] = 0;
  }
  for (const t of activeTx) {
    const hour = new Date(t.date).getHours();
    if (hourlyData[hour] !== undefined) {
      hourlyData[hour] += t.grandTotal;
    }
  }
  const chartData = Object.entries(hourlyData).map(([hour, amount]) => ({
    hour: `${hour}:00`,
    omzet: amount,
  }));

  // Payment method breakdown
  const paymentMethodCount: Record<string, number> = {};
  for (const t of activeTx) {
    const m = t.paymentMethod.toUpperCase();
    paymentMethodCount[m] = (paymentMethodCount[m] || 0) + 1;
  }
  const pieData = Object.entries(paymentMethodCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Export handlers
  const handleExportExcel = () => {
    const periodLabels = {
      today: 'Hari Ini',
      week: '7 Hari Terakhir',
      month: 'Bulan Ini',
    };

    const enrichedItems = periodItems.map((it) => {
      const tx = transactions.find((t) => t.id === it.transactionId);
      const itAddons = addons.filter((a) => a.transactionItemId === it.id);
      const addonsText = itAddons.map((a) => a.addonNameSnapshot).join(', ');

      return {
        ...it,
        invoiceNumber: tx?.invoiceNumber || '-',
        addonsText,
      };
    });

    exportToExcel(
      {
        settings: settings || undefined,
        transactions: activeTx,
        items: enrichedItems,
        expenses: periodExpenses,
        summary: {
          periodLabel: periodLabels[period],
          totalTurnover,
          transactionCount: activeTx.length,
          totalExpense,
          netCash,
        },
      },
      `Laporan-${period}-${todayDateOnly}.xlsx`
    );
  };

  const handleExportPdf = () => {
    const periodLabels = {
      today: 'Hari Ini',
      week: '7 Hari Terakhir',
      month: 'Bulan Ini',
    };

    exportToPdf(
      {
        settings: settings || undefined,
        periodLabel: periodLabels[period],
        totalTurnover,
        transactionCount: activeTx.length,
        totalExpense,
        netCash,
        transactions: activeTx,
      },
      `Laporan-${period}-${todayDateOnly}.pdf`
    );
  };

  const handleShareSummaryWA = () => {
    const text = [
      `*LAPORAN SAKUSALES - ${settings?.storeName || 'Toko'}*`,
      `Periode: ${period.toUpperCase()} (${formatDateTimeId(new Date())})`,
      '--------------------------------',
      `Omzet Penjualan : *${formatRupiah(totalTurnover)}*`,
      `Transaksi Lunas : ${activeTx.length} Transaksi`,
      `Rata-rata/Nota  : ${formatRupiah(avgPerTx)}`,
      `Pengeluaran     : -${formatRupiah(totalExpense)}`,
      `Pemasukan Lain  : +${formatRupiah(totalOtherIncome)}`,
      `*Saldo Bersih    : ${formatRupiah(netCash)}*`,
      '--------------------------------',
      '_Dikirim via SakuSales PWA_',
    ].join('\n');

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2747]">Laporan &amp; Analitik</h1>
          <p className="text-xs text-[#6B7280]">
            Pantau omzet, laba kotor, arus kas, dan ekspor data ke Excel/PDF
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="pos-btn bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="pos-btn bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={handleShareSummaryWA}
            className="pos-btn bg-white border border-[#E2E8F0] text-[#0F2747] hover:bg-[#F5F8FB] px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs"
          >
            <Share2 className="w-4 h-4 mr-1.5 text-emerald-600" />
            Bagikan WA
          </button>
        </div>
      </div>

      {/* Period Filter Selector */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setPeriod('today')}
          className={`pos-btn px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            period === 'today'
              ? 'saku-gradient-bg text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#0F2747]'
          }`}
        >
          Hari Ini
        </button>
        <button
          type="button"
          onClick={() => setPeriod('week')}
          className={`pos-btn px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            period === 'week'
              ? 'saku-gradient-bg text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#0F2747]'
          }`}
        >
          7 Hari Terakhir
        </button>
        <button
          type="button"
          onClick={() => setPeriod('month')}
          className={`pos-btn px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            period === 'month'
              ? 'saku-gradient-bg text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#0F2747]'
          }`}
        >
          Bulan Ini
        </button>
      </div>

      {/* BENTO GRID: 4 KEY KPI METRIC TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#6B7280] uppercase">Omzet Penjualan</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#0F2747] mt-1">
            {formatRupiah(totalTurnover)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {activeTx.length} Transaksi Berhasil
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#6B7280] uppercase">Rata-rata Nota</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#1EB6E6] mt-1">
            {formatRupiah(avgPerTx)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold">Per transaksi</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#6B7280] uppercase">Pengeluaran</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[#EF4444] mt-1">
            {formatRupiah(totalExpense)}
          </p>
          <span className="text-[10px] text-red-500 font-semibold">
            {periodExpenses.length} Pencatatan
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold text-[#6B7280] uppercase">Saldo Kas Bersih</span>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${netCash >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {formatRupiah(netCash)}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold">Arus Kas Masuk - Keluar</span>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales by Hour (Bar Chart) */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#0F2747] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1EB6E6]" />
              Grafik Penjualan per Jam
            </h3>
            <span className="text-[11px] text-[#6B7280] font-semibold">Jam 08:00 - 22:00</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Omzet']}
                  labelStyle={{ fontWeight: 'bold', color: '#0F2747' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="omzet" fill="#1EB6E6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown (Pie Chart) */}
        <div className="p-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#0F2747] flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-[#7BE07A]" />
              Metode Pembayaran
            </h3>

            {pieData.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B7280]">Belum ada data</div>
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-center">
            {pieData.map((d, idx) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F2747]">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                />
                <span>
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP SELLING PRODUCTS & HPP MARGIN TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
        <h3 className="font-bold text-sm text-[#0F2747] mb-4 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#1EB6E6]" />
          Rekap Penjualan Menu &amp; Estimasi Laba
        </h3>

        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7280]">
            Belum ada penjualan menu pada periode ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F8FB] text-[#0F2747] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3">Nama Produk</th>
                  <th className="p-3">Terjual (Qty)</th>
                  <th className="p-3">Total Omzet</th>
                  <th className="p-3">Total HPP</th>
                  <th className="p-3">Laba Kotor</th>
                  <th className="p-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {topProducts.map((p) => {
                  const grossProfit = p.turnover - p.hpp;
                  const marginPercent = p.turnover > 0 ? ((grossProfit / p.turnover) * 100).toFixed(1) : 0;

                  return (
                    <tr key={p.name} className="hover:bg-[#F5F8FB]">
                      <td className="p-3 font-bold text-[#0F2747]">{p.name}</td>
                      <td className="p-3 font-bold text-[#1EB6E6]">{p.qty} porsi</td>
                      <td className="p-3 font-semibold">{formatRupiah(p.turnover)}</td>
                      <td className="p-3 text-slate-500">
                        {p.hpp > 0 ? formatRupiah(p.hpp) : '-'}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        {p.hpp > 0 ? formatRupiah(grossProfit) : '-'}
                      </td>
                      <td className="p-3 font-extrabold text-right text-emerald-700">
                        {p.hpp > 0 ? `${marginPercent}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
