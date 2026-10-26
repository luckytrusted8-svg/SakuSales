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
  AlertCircle,
  Tag,
  Check,
} from 'lucide-react';
import { productRepo } from '../../../lib/repositories/productRepo';
import { categoryRepo } from '../../../lib/repositories/categoryRepo';
import type { ProductEntity, CategoryEntity } from '../../../lib/db/schema';
import { formatRupiah } from '../../../lib/format/rupiah';
import { EmptyState } from '../../../components/shared/EmptyState';

export default function KatalogProdukPage() {
  const [products, setProducts] = useState<ProductEntity[]>([]);
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductEntity | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Delete notification
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        productRepo.getAll(false),
        categoryRepo.getAll('product'),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Load katalog error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormCategory(categories[0]?.id || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductEntity) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(p.basePrice.toString());
    setFormCategory(p.categoryId || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const priceNum = parseInt(formPrice.replace(/[^0-9]/g, ''), 10);
    if (!formName.trim()) {
      setErrorMsg('Nama produk wajib diisi');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Harga produk harus lebih dari Rp 0');
      return;
    }

    try {
      if (editingProduct) {
        await productRepo.update(editingProduct.id, {
          name: formName,
          basePrice: priceNum,
          categoryId: formCategory,
        });
        setActionNotice({ type: 'success', message: `Produk "${formName}" berhasil diperbarui` });
      } else {
        await productRepo.create({
          name: formName,
          basePrice: priceNum,
          categoryId: formCategory,
        });
        setActionNotice({ type: 'success', message: `Produk "${formName}" berhasil ditambahkan` });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan produk');
    }
  };

  const handleToggleActive = async (p: ProductEntity) => {
    const newStatus = await productRepo.toggleActive(p.id);
    setActionNotice({
      type: 'success',
      message: `Produk "${p.name}" ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
    });
    loadData();
  };

  const handleDeleteProduct = async (p: ProductEntity) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus produk "${p.name}"?`);
    if (!confirmDelete) return;

    const res = await productRepo.delete(p.id);
    if (res.success) {
      setActionNotice({ type: 'success', message: `Produk "${p.name}" berhasil dihapus` });
      loadData();
    } else {
      setActionNotice({
        type: 'error',
        message: res.reason || 'Produk tidak dapat dihapus',
      });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const created = await categoryRepo.create(newCategoryName, 'product');
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      setCategories((prev) => [...prev, created]);
      setFormCategory(created.id);
      setActionNotice({ type: 'success', message: `Kategori "${created.name}" berhasil dibuat` });
    } catch (err: any) {
      alert(err.message || 'Gagal membuat kategori');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2747]">Katalog Produk &amp; Varian</h1>
          <p className="text-xs text-[#6B7280]">
            Kelola menu jualan, harga satuan, dan kategori produk
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="pos-btn bg-white border border-[#E2E8F0] text-[#0F2747] px-4 py-2.5 text-xs font-bold hover:bg-[#F5F8FB]"
          >
            <Tag className="w-4 h-4 mr-1.5" />
            + Kategori
          </button>
          <button
            id="add-product-btn"
            type="button"
            onClick={openCreateModal}
            className="pos-btn saku-gradient-bg text-white px-5 py-2.5 text-xs font-bold shadow-xs hover:opacity-95"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Tabs Sub-navigation */}
      <div className="flex gap-2 mb-6 border-b border-[#E2E8F0] pb-2">
        <Link
          href="/katalog"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F2747] text-white"
        >
          <Boxes className="w-4 h-4" />
          <span>Produk ({products.length})</span>
        </Link>
        <Link
          href="/katalog/varian"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#0F2747] hover:bg-white"
        >
          <Layers className="w-4 h-4" />
          <span>Varian Tambahan (Glaze, Topping)</span>
        </Link>
        <Link
          href="/katalog/resep"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#0F2747] hover:bg-white"
        >
          <FlaskConical className="w-4 h-4" />
          <span>Bahan Baku &amp; Resep HPP</span>
        </Link>
      </div>

      {/* Notice Alert */}
      {actionNotice && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter kategori produk"
            className="px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
          >
            <option value="all">Semua Kategori ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Products Grid or Empty State */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#6B7280]">Memuat daftar produk...</div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Belum ada produk"
          description="Tambahkan produk jualan pertama Anda agar kasir bisa langsung mencatat pesanan pelanggan."
          actionLabel="+ Tambah Produk Pertama"
          onAction={openCreateModal}
        />
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#E2E8F0]">
          Tidak ada produk yang cocok dengan pencarian "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all ${
                p.isActive
                  ? 'bg-white border-[#E2E8F0] shadow-xs hover:border-[#1EB6E6]'
                  : 'bg-slate-50/80 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-sm text-[#0F2747] leading-snug">{p.name}</h3>
                  {p.categoryName && (
                    <span className="inline-block mt-0.5 text-[10px] font-semibold text-[#1EB6E6] bg-cyan-50 px-2 py-0.5 rounded-md">
                      {p.categoryName}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleActive(p)}
                  title={p.isActive ? 'Nonaktifkan produk' : 'Aktifkan produk'}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    p.isActive
                      ? 'text-[#22C55E] hover:bg-emerald-50'
                      : 'text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-baseline justify-between my-3">
                <span className="text-base font-extrabold text-[#0F2747]">
                  {formatRupiah(p.basePrice)}
                </span>
                <span className={`text-[10px] font-bold ${p.isActive ? 'text-[#22C55E]' : 'text-slate-400'}`}>
                  {p.isActive ? 'Aktif di Kasir' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(p)}
                  className="pos-btn text-xs text-slate-600 hover:text-[#0F2747] hover:bg-slate-100 px-3 py-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(p)}
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

      {/* MODAL TAMBAH / UBAH PRODUK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-[#0F2747] mb-1">
              {editingProduct ? 'Ubah Produk' : 'Tambah Produk Baru'}
            </h2>
            <p className="text-xs text-[#6B7280] mb-4">
              Isi detail produk jualan Anda. Semua harga akan tersimpan sebagai snapshot saat transaksi.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#EF4444] text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Nama Produk <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Keju Aroma Nyaman"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Harga Satuan (Rp) <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="500"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Contoh: 11000"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
                />
                <span className="text-[11px] text-[#6B7280]">
                  Tampil sebagai: {formatRupiah(parseInt(formPrice, 10) || 0)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#0F2747]">Kategori Produk</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[11px] text-[#1EB6E6] font-semibold hover:underline"
                  >
                    + Kategori Baru
                  </button>
                </div>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  id="submit-product-btn"
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BUAT KATEGORI BARU */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-[#0F2747] mb-1">Buat Kategori Baru</h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Contoh: Makanan, Minuman, Frozen Food, Paket Hemat
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama kategori..."
                className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6] focus:bg-white"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="pos-btn w-1/2 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn w-1/2 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
