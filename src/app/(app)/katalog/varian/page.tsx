'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Boxes,
  Layers,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { addonRepo } from '../../../../lib/repositories/addonRepo';
import type { AddonVariantEntity } from '../../../../lib/db/schema';
import { formatRupiah } from '../../../../lib/format/rupiah';
import { EmptyState } from '../../../../components/shared/EmptyState';

export default function VarianTambahanPage() {
  const [addons, setAddons] = useState<AddonVariantEntity[]>([]);
  const [distinctTypes, setDistinctTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonVariantEntity | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [allAddons, types] = await Promise.all([
        addonRepo.getAll(false),
        addonRepo.getDistinctVariantTypes(),
      ]);
      setAddons(allAddons);
      setDistinctTypes(types);
    } catch (err) {
      console.error('Load addons error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingAddon(null);
    setFormName('');
    setFormType(distinctTypes[0] || 'Glaze');
    setFormPrice('2000');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (a: AddonVariantEntity) => {
    setEditingAddon(a);
    setFormName(a.name);
    setFormType(a.variantType);
    setFormPrice(a.extraPrice.toString());
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const priceNum = parseInt(formPrice.replace(/[^0-9]/g, ''), 10);
    if (!formName.trim()) {
      setErrorMsg('Nama varian wajib diisi');
      return;
    }
    if (!formType.trim()) {
      setErrorMsg('Jenis varian (misal: Glaze, Topping) wajib diisi');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('Harga tambahan tidak boleh negatif');
      return;
    }

    try {
      if (editingAddon) {
        await addonRepo.update(editingAddon.id, {
          name: formName,
          variantType: formType,
          extraPrice: priceNum,
        });
        setNotice({ type: 'success', message: `Varian "${formName}" berhasil diperbarui` });
      } else {
        await addonRepo.create({
          name: formName,
          variantType: formType,
          extraPrice: priceNum,
        });
        setNotice({ type: 'success', message: `Varian "${formName}" berhasil ditambahkan` });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan varian');
    }
  };

  const handleToggleActive = async (a: AddonVariantEntity) => {
    const newStatus = await addonRepo.toggleActive(a.id);
    setNotice({
      type: 'success',
      message: `Varian "${a.name}" ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
    });
    loadData();
  };

  const handleDeleteAddon = async (a: AddonVariantEntity) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus varian "${a.name}"?`);
    if (!confirmDelete) return;

    const res = await addonRepo.delete(a.id);
    if (res.success) {
      setNotice({ type: 'success', message: `Varian "${a.name}" berhasil dihapus` });
      loadData();
    } else {
      setNotice({ type: 'error', message: res.reason || 'Varian tidak dapat dihapus' });
    }
  };

  const filteredAddons = addons.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchType = selectedType === 'all' || a.variantType.toLowerCase() === selectedType.toLowerCase();
    return matchSearch && matchType;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2747]">Varian Tambahan</h1>
          <p className="text-xs text-[#6B7280]">
            Glaze tambahan, topping, pilihan rasa, atau sebutan lain yang Anda inginkan
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="pos-btn saku-gradient-bg text-white px-5 py-2.5 text-xs font-bold shadow-xs hover:opacity-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Varian
        </button>
      </div>

      {/* Tabs Sub-navigation */}
      <div className="flex gap-2 mb-6 border-b border-[#E2E8F0] pb-2">
        <Link
          href="/katalog"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#0F2747] hover:bg-white"
        >
          <Boxes className="w-4 h-4" />
          <span>Produk</span>
        </Link>
        <Link
          href="/katalog/varian"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F2747] text-white"
        >
          <Layers className="w-4 h-4" />
          <span>Varian Tambahan ({addons.length})</span>
        </Link>
        <Link
          href="/katalog/resep"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#0F2747] hover:bg-white"
        >
          <FlaskConical className="w-4 h-4" />
          <span>Bahan Baku &amp; Resep HPP</span>
        </Link>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari varian tambahan..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
          />
        </div>

        {distinctTypes.length > 0 && (
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filter jenis varian"
            className="px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
          >
            <option value="all">Semua Jenis ({distinctTypes.length})</option>
            {distinctTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* List Grid or Empty State */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#6B7280]">Memuat data varian...</div>
      ) : addons.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Belum ada varian tambahan"
          description="Varian tambahan bersifat opsional. Anda bisa membuat Glaze, Topping Keju, Ekstra Pedas, atau pilihan ukuran porsi sesuai kebutuhan dagangan Anda."
          actionLabel="+ Buat Varian Pertama"
          onAction={openCreateModal}
        />
      ) : filteredAddons.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#E2E8F0]">
          Tidak ada varian tambahan yang cocok dengan pencarian
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAddons.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-2xl border transition-all ${
                a.isActive
                  ? 'bg-white border-[#E2E8F0] shadow-xs hover:border-[#1EB6E6]'
                  : 'bg-slate-50/80 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-sm text-[#0F2747]">{a.name}</h3>
                  <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Jenis: {a.variantType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleActive(a)}
                  title={a.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    a.isActive
                      ? 'text-[#22C55E] hover:bg-emerald-50'
                      : 'text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-baseline justify-between my-3">
                <span className="text-base font-extrabold text-[#0F2747]">
                  +{formatRupiah(a.extraPrice)}
                </span>
                <span className={`text-[10px] font-bold ${a.isActive ? 'text-[#22C55E]' : 'text-slate-400'}`}>
                  {a.isActive ? 'Aktif di Kasir' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(a)}
                  className="pos-btn text-xs text-slate-600 hover:text-[#0F2747] hover:bg-slate-100 px-3 py-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAddon(a)}
                  className="pos-btn text-xs text-slate-400 hover:text-[#EF4444] hover:bg-red-50 px-3 py-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREATE / EDIT ADDON */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-[#0F2747] mb-1">
              {editingAddon ? 'Ubah Varian Tambahan' : 'Tambah Varian Baru'}
            </h2>
            <p className="text-xs text-[#6B7280] mb-4">
              Varian tambahan bisa berupa Glaze, Topping, Tingkat Kepedasan, atau Ukuran Porsi
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#EF4444] text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveAddon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Jenis Varian <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  placeholder="Contoh: Glaze, Topping, Porsi, Rasa"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
                />
                <span className="text-[11px] text-[#6B7280]">
                  Gunakan jenis yang sama untuk mengelompokkan varian sejenis di kasir
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Nama Varian Tambahan <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Glaze Cokelat, Keju Parut, Extra Mayo"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Harga Tambahan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Contoh: 2000 (boleh 0 jika gratis)"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
                />
                <span className="text-[11px] text-[#6B7280]">
                  Tampil di kasir: +{formatRupiah(parseInt(formPrice, 10) || 0)}
                </span>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="pos-btn w-1/3 bg-[#F5F8FB] border border-[#E2E8F0] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  {editingAddon ? 'Simpan Perubahan' : 'Tambah Varian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
