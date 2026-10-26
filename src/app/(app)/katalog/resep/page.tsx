'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Layers,
  FlaskConical,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Scale,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { ingredientRepo } from '../../../../lib/repositories/ingredientRepo';
import { productRepo } from '../../../../lib/repositories/productRepo';
import { addonRepo } from '../../../../lib/repositories/addonRepo';
import type {
  IngredientEntity,
  ProductEntity,
  AddonVariantEntity,
  RecipeLineEntity,
  IngredientUnit,
} from '../../../../lib/db/schema';
import { formatRupiah } from '../../../../lib/format/rupiah';
import { calculateRecipeCost } from '../../../../lib/domain/hpp';
import { EmptyState } from '../../../../components/shared/EmptyState';

export default function ResepHppPage() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes'>('ingredients');
  const [ingredients, setIngredients] = useState<IngredientEntity[]>([]);
  const [products, setProducts] = useState<ProductEntity[]>([]);
  const [addons, setAddons] = useState<AddonVariantEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ingredient Modal
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<IngredientEntity | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState<IngredientUnit>('gram');
  const [ingPrice, setIngPrice] = useState('');
  const [ingPackageSize, setIngPackageSize] = useState('1000');
  const [ingError, setIngError] = useState('');

  // Recipe Editor Modal
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeTarget, setRecipeTarget] = useState<{
    type: 'product' | 'addon';
    id: string;
    name: string;
    basePrice: number;
  } | null>(null);
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; amount: number }[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [ings, prods, addns] = await Promise.all([
        ingredientRepo.getAllIngredients(false),
        productRepo.getAll(false),
        addonRepo.getAll(false),
      ]);
      setIngredients(ings);
      setProducts(prods);
      setAddons(addns);
    } catch (err) {
      console.error('Load recipe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddIngredientModal = () => {
    setEditingIng(null);
    setIngName('');
    setIngUnit('gram');
    setIngPrice('');
    setIngPackageSize('1000');
    setIngError('');
    setIsIngModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngError('');

    const priceNum = parseInt(ingPrice.replace(/[^0-9]/g, ''), 10);
    const sizeNum = parseFloat(ingPackageSize);

    if (!ingName.trim()) {
      setIngError('Nama bahan baku wajib diisi');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setIngError('Harga beli bahan tidak valid');
      return;
    }
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setIngError('Isi kemasan harus lebih besar dari 0');
      return;
    }

    try {
      if (editingIng) {
        await ingredientRepo.updateIngredient(editingIng.id, {
          name: ingName,
          baseUnit: ingUnit,
          purchasePrice: priceNum,
          packageSize: sizeNum,
        });
        setNotice({ type: 'success', message: `Bahan "${ingName}" berhasil diperbarui` });
      } else {
        await ingredientRepo.createIngredient({
          name: ingName,
          baseUnit: ingUnit,
          purchasePrice: priceNum,
          packageSize: sizeNum,
        });
        setNotice({ type: 'success', message: `Bahan "${ingName}" berhasil ditambahkan` });
      }
      setIsIngModalOpen(false);
      loadData();
    } catch (err: any) {
      setIngError(err.message || 'Gagal menyimpan bahan');
    }
  };

  const handleDeleteIngredient = async (ing: IngredientEntity) => {
    const confirmDelete = window.confirm(`Hapus bahan baku "${ing.name}"?`);
    if (!confirmDelete) return;

    const res = await ingredientRepo.deleteIngredient(ing.id);
    if (res.success) {
      setNotice({ type: 'success', message: `Bahan "${ing.name}" dihapus` });
      loadData();
    } else {
      setNotice({ type: 'error', message: res.reason || 'Bahan tidak dapat dihapus' });
    }
  };

  const openRecipeEditor = async (type: 'product' | 'addon', item: ProductEntity | AddonVariantEntity) => {
    const lines = await ingredientRepo.getRecipe(type, item.id);
    setRecipeTarget({
      type,
      id: item.id,
      name: item.name,
      basePrice: 'basePrice' in item ? item.basePrice : item.extraPrice,
    });
    setRecipeLines(lines.map((l) => ({ ingredientId: l.ingredientId, amount: l.amount })));
    setIsRecipeModalOpen(true);
  };

  const handleSaveRecipe = async () => {
    if (!recipeTarget) return;

    try {
      await ingredientRepo.saveRecipe({
        targetType: recipeTarget.type,
        targetId: recipeTarget.id,
        lines: recipeLines.filter((l) => l.ingredientId && l.amount > 0),
      });
      setIsRecipeModalOpen(false);
      setNotice({
        type: 'success',
        message: `Resep untuk "${recipeTarget.name}" berhasil disimpan`,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan resep');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2747]">Bahan Baku &amp; HPP</h1>
          <p className="text-xs text-[#6B7280]">
            Kalkulasi Harga Pokok Penjualan (HPP) per porsi dan estimasi laba kotor
          </p>
        </div>

        {activeTab === 'ingredients' && (
          <button
            type="button"
            onClick={openAddIngredientModal}
            className="pos-btn saku-gradient-bg text-white px-5 py-2.5 text-xs font-bold shadow-xs hover:opacity-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Bahan Baku
          </button>
        )}
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#0F2747] hover:bg-white"
        >
          <Layers className="w-4 h-4" />
          <span>Varian Tambahan</span>
        </Link>
        <Link
          href="/katalog/resep"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F2747] text-white"
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

      {/* Internal Subtabs: Bahan Baku vs Resep Produk */}
      <div className="flex gap-3 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('ingredients')}
          className={`pos-btn px-4 py-2 text-xs font-bold ${
            activeTab === 'ingredients'
              ? 'bg-white border border-[#1EB6E6] text-[#0F2747] shadow-xs'
              : 'text-[#6B7280] hover:bg-white'
          }`}
        >
          <Scale className="w-4 h-4 mr-1.5" />
          Daftar Bahan Baku ({ingredients.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recipes')}
          className={`pos-btn px-4 py-2 text-xs font-bold ${
            activeTab === 'recipes'
              ? 'bg-white border border-[#1EB6E6] text-[#0F2747] shadow-xs'
              : 'text-[#6B7280] hover:bg-white'
          }`}
        >
          <FlaskConical className="w-4 h-4 mr-1.5" />
          Resep Menu ({products.length + addons.length})
        </button>
      </div>

      {/* TAB 1: BAHAN BAKU */}
      {activeTab === 'ingredients' && (
        <div>
          {ingredients.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="Belum ada data bahan baku"
              description="Catat bahan dasar (misal: keju mozzarella, kulit lumpia, minyak, kemasan box) untuk menghitung HPP secara otomatis."
              actionLabel="+ Tambah Bahan Pertama"
              onAction={openAddIngredientModal}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F8FB] text-[#0F2747] border-b border-[#E2E8F0] font-bold">
                    <tr>
                      <th className="p-3.5">Nama Bahan</th>
                      <th className="p-3.5">Satuan</th>
                      <th className="p-3.5">Harga Beli Kemasan</th>
                      <th className="p-3.5">Isi Kemasan</th>
                      <th className="p-3.5">Biaya / Satuan Dasar</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {ingredients.map((ing) => (
                      <tr key={ing.id} className="hover:bg-[#F5F8FB]">
                        <td className="p-3.5 font-bold text-[#0F2747]">{ing.name}</td>
                        <td className="p-3.5 font-semibold text-[#1EB6E6]">{ing.baseUnit}</td>
                        <td className="p-3.5 font-medium">{formatRupiah(ing.purchasePrice)}</td>
                        <td className="p-3.5 font-medium">
                          {ing.packageSize} {ing.baseUnit}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-600">
                          {formatRupiah(ing.costPerUnit)} / {ing.baseUnit}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteIngredient(ing)}
                            className="p-1 text-slate-400 hover:text-[#EF4444] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESEP PRODUK & VARIAN */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          {/* Produk List */}
          <div>
            <h2 className="text-sm font-bold text-[#0F2747] mb-3 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#1EB6E6]" />
              Resep Produk Menu
            </h2>
            {products.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#E2E8F0]">
                Belum ada produk. Tambahkan produk di tab Produk terlebih dahulu.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-[#0F2747]">{p.name}</h3>
                      <p className="text-xs text-[#6B7280]">Jual: {formatRupiah(p.basePrice)}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.hasRecipe
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.hasRecipe ? '✓ Resep Diatur' : 'Belum Ada Resep'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openRecipeEditor('product', p)}
                      className="pos-btn bg-[#F5F8FB] hover:bg-[#1EB6E6] hover:text-white text-[#0F2747] p-2 text-xs font-semibold rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Varian List */}
          <div>
            <h2 className="text-sm font-bold text-[#0F2747] mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Resep Varian Tambahan (Glaze, Topping)
            </h2>
            {addons.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#E2E8F0]">
                Belum ada varian tambahan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-[#0F2747]">{a.name}</h3>
                      <p className="text-xs text-[#6B7280]">
                        Tambahan: +{formatRupiah(a.extraPrice)}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                          a.hasRecipe
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {a.hasRecipe ? '✓ Resep Diatur' : 'Belum Ada Resep'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openRecipeEditor('addon', a)}
                      className="pos-btn bg-[#F5F8FB] hover:bg-emerald-600 hover:text-white text-[#0F2747] p-2 text-xs font-semibold rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TAMBAH BAHAN BAKU */}
      {isIngModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-[#0F2747] mb-1">Tambah Bahan Baku</h2>
            <p className="text-xs text-[#6B7280] mb-4">
              Harga per satuan dasar (gram, ml, atau pcs) akan dihitung otomatis
            </p>

            {ingError && (
              <div className="mb-4 p-3 bg-red-50 text-[#EF4444] text-xs font-semibold rounded-xl">
                {ingError}
              </div>
            )}

            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">Nama Bahan</label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="Contoh: Keju Mozzarella"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F2747]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F2747] mb-1">Satuan Dasar</label>
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2747]"
                  >
                    <option value="gram">gram</option>
                    <option value="ml">ml (mililiter)</option>
                    <option value="pcs">pcs (buah/lembar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F2747] mb-1">Isi Kemasan</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={ingPackageSize}
                    onChange={(e) => setIngPackageSize(e.target.value)}
                    placeholder="Contoh: 1000"
                    className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F2747]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F2747] mb-1">
                  Harga Beli Kemasan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={ingPrice}
                  onChange={(e) => setIngPrice(e.target.value)}
                  placeholder="Contoh: 80000"
                  className="w-full px-4 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F2747]"
                />
              </div>

              {ingPrice && ingPackageSize && (
                <div className="p-3 bg-cyan-50 rounded-xl text-xs text-[#0F2747] font-semibold">
                  Biaya bahan:{' '}
                  <span className="font-bold text-[#1EB6E6]">
                    {formatRupiah(parseInt(ingPrice, 10) / (parseFloat(ingPackageSize) || 1))}
                  </span>{' '}
                  per {ingUnit}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngModalOpen(false)}
                  className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESEP EDITOR */}
      {isRecipeModalOpen && recipeTarget && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <h2 className="text-lg font-bold text-[#0F2747]">
              Atur Resep: {recipeTarget.name}
            </h2>
            <p className="text-xs text-[#6B7280] mb-4">
              Pilih bahan baku dan takaran yang dibutuhkan untuk 1 porsi
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {recipeLines.map((line, idx) => {
                const selectedIng = ingredients.find((i) => i.id === line.ingredientId);
                const cost = selectedIng ? Math.round(line.amount * selectedIng.costPerUnit) : 0;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-[#F5F8FB] rounded-xl border border-[#E2E8F0] flex items-center gap-2"
                  >
                    <select
                      value={line.ingredientId}
                      onChange={(e) => {
                        const updated = [...recipeLines];
                        updated[idx].ingredientId = e.target.value;
                        setRecipeLines(updated);
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F2747]"
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({formatRupiah(ing.costPerUnit)}/{ing.baseUnit})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 w-28">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={line.amount}
                        onChange={(e) => {
                          const updated = [...recipeLines];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setRecipeLines(updated);
                        }}
                        placeholder="Takaran"
                        className="w-full px-2 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-center"
                      />
                      <span className="text-[11px] font-bold text-slate-500">
                        {selectedIng?.baseUnit || ''}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-[#0F2747] w-20 text-right">
                      {formatRupiah(cost)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setRecipeLines(recipeLines.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-[#EF4444] rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setRecipeLines([...recipeLines, { ingredientId: '', amount: 0 }])}
                className="pos-btn w-full bg-white border border-dashed border-[#1EB6E6] text-[#1EB6E6] text-xs font-bold py-2.5 hover:bg-cyan-50"
              >
                + Tambah Bahan ke Resep
              </button>
            </div>

            {/* Recipe HPP Summary */}
            <div className="border-t border-[#E2E8F0] pt-4 mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#0F2747] mb-1">
                <span>Total HPP per Porsi:</span>
                <span className="text-base text-emerald-600">
                  {formatRupiah(
                    recipeLines.reduce((sum, l) => {
                      const ing = ingredients.find((i) => i.id === l.ingredientId);
                      return sum + (ing ? Math.round(l.amount * ing.costPerUnit) : 0);
                    }, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveRecipe}
                className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-md hover:opacity-95"
              >
                Simpan Resep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
