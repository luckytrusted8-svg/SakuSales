'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Boxes,
  Layers,
  Sparkles,
} from 'lucide-react';
import { productRepo } from '../../../lib/repositories/productRepo';
import { addonRepo } from '../../../lib/repositories/addonRepo';
import { categoryRepo } from '../../../lib/repositories/categoryRepo';
import type { ProductEntity, AddonVariantEntity, CategoryEntity, TransactionEntity } from '../../../lib/db/schema';
import { formatRupiah } from '../../../lib/format/rupiah';
import { useCartStore } from '../../../stores/cartStore';
import { AddonSelectionModal } from '../../../components/kasir/AddonSelectionModal';
import { PaymentModal } from '../../../components/kasir/PaymentModal';
import { SuccessModal } from '../../../components/kasir/SuccessModal';
import { EmptyState } from '../../../components/shared/EmptyState';

export default function KasirPage() {
  const [products, setProducts] = useState<ProductEntity[]>([]);
  const [addons, setAddons] = useState<AddonVariantEntity[]>([]);
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [configuringProduct, setConfiguringProduct] = useState<ProductEntity | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState<TransactionEntity | null>(null);

  // Cart store
  const {
    items: cartItems,
    addItem,
    updateItemQty,
    removeItem,
    clearCart,
    getTotals,
  } = useCartStore();

  const { grossTotal, discountAmount, grandTotal, totalQty } = getTotals();

  useEffect(() => {
    async function loadPosData() {
      try {
        const [activeProds, activeAddons, cats] = await Promise.all([
          productRepo.getAll(true),
          addonRepo.getAll(true),
          categoryRepo.getAll('product'),
        ]);
        setProducts(activeProds);
        setAddons(activeAddons);
        setCategories(cats);
      } catch (err) {
        console.error('POS Load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPosData();
  }, []);

  const handleProductTap = (p: ProductEntity) => {
    // If there are active addons, open addon modal so cashier can choose glaze/topping
    if (addons.length > 0) {
      setConfiguringProduct(p);
    } else {
      // 1-tap immediate addition
      addItem({
        productId: p.id,
        name: p.name,
        basePrice: p.basePrice,
        qty: 1,
      });
    }
  };

  const handleConfirmAddon = (
    selectedAddons: { addonId: string; name: string; extraPrice: number }[],
    notes: string
  ) => {
    if (!configuringProduct) return;

    addItem({
      productId: configuringProduct.id,
      name: configuringProduct.name,
      basePrice: configuringProduct.basePrice,
      addons: selectedAddons,
      qty: 1,
      notes: notes.trim() || undefined,
    });

    setConfiguringProduct(null);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-[calc(100vh-64px)]">
      {/* LEFT: PRODUCTS WORKBENCH GRID */}
      <div className="flex-1 p-3 sm:p-5 flex flex-col min-w-0">
        {/* Search and Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jajanan / menu cepat..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747] focus:outline-none focus:border-[#1EB6E6]"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                onClick={() => setSelectedCat('all')}
                className={`pos-btn px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
                  selectedCat === 'all'
                    ? 'bg-[#0F2747] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#6B7280] hover:text-[#0F2747]'
                }`}
              >
                Semua
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`pos-btn px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
                    selectedCat === c.id
                      ? 'bg-[#0F2747] text-white'
                      : 'bg-white border border-[#E2E8F0] text-[#6B7280] hover:text-[#0F2747]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid Area */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6B7280]">Memuat menu kasir...</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Belum ada produk di katalog"
            description="Tambahkan produk jualan pertama Anda di menu Katalog agar bisa langsung ditransaksikan."
            actionLabel="+ Buka Katalog Produk"
            onAction={() => (window.location.href = '/katalog')}
          />
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280] bg-white rounded-2xl border border-[#E2E8F0]">
            Tidak ditemukan menu dengan nama "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProductTap(p)}
                className="pos-btn flex-col items-start p-3.5 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs hover:border-[#1EB6E6] hover:shadow-sm text-left transition-all active:scale-[0.98] group relative min-h-[105px]"
              >
                <div className="w-full flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xs sm:text-sm text-[#0F2747] line-clamp-2 leading-snug">
                    {p.name}
                  </h3>
                  {addons.length > 0 && (
                    <span className="p-1 rounded-md bg-slate-50 text-slate-400 group-hover:text-[#1EB6E6] group-hover:bg-cyan-50 shrink-0 ml-1">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-auto w-full flex items-baseline justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-[#0F2747]">
                    {formatRupiah(p.basePrice)}
                  </span>
                  <span className="w-6 h-6 rounded-lg saku-gradient-bg flex items-center justify-center text-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: CART PANEL / WORKBENCH SIDEBAR */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-[#E2E8F0] flex flex-col justify-between p-4 sm:p-5 shrink-0 shadow-xs">
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl saku-gradient-bg flex items-center justify-center text-white shadow-2xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-[#0F2747]">
                Pesanan Aktif ({totalQty})
              </h2>
            </div>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] font-semibold text-slate-400 hover:text-[#EF4444]"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Items List */}
          {cartItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B7280]">
              <p className="font-semibold mb-1">Keranjang masih kosong</p>
              <p className="text-[11px] text-slate-400">
                Ketuk produk di sebelah kiri untuk menambah ke pesanan
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[38vh] lg:max-h-[52vh] overflow-y-auto pr-1">
              {cartItems.map((item, idx) => {
                const addonsPrice = (item.addons || []).reduce(
                  (sum, a) => sum + a.extraPrice * (a.qty || 1),
                  0
                );
                const itemSubtotal = (item.basePrice + addonsPrice) * item.qty;

                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="p-3 bg-[#F5F8FB] rounded-xl border border-[#E2E8F0] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-[#0F2747] leading-snug">
                          {item.name}
                        </h4>
                        {item.addons && item.addons.length > 0 && (
                          <div className="space-y-0.5 mt-0.5">
                            {item.addons.map((addon) => (
                              <p
                                key={addon.addonId}
                                className="text-[10px] text-cyan-700 font-semibold"
                              >
                                + {addon.name}{' '}
                                {addon.extraPrice > 0 ? `(${formatRupiah(addon.extraPrice)})` : ''}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      <span className="text-xs font-bold text-[#0F2747] shrink-0">
                        {formatRupiah(itemSubtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, item.qty - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] hover:border-slate-300 flex items-center justify-center text-slate-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-[#0F2747]">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, item.qty + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] hover:border-slate-300 flex items-center justify-center text-slate-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-slate-400 hover:text-[#EF4444]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Totals & Checkout Button */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-2 mt-4">
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>Subtotal:</span>
            <span>{formatRupiah(grossTotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs font-semibold text-emerald-600">
              <span>Diskon:</span>
              <span>-{formatRupiah(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-1">
            <span className="text-xs font-bold text-[#0F2747]">Total Tagihan:</span>
            <span className="text-xl font-extrabold text-[#0F2747]">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          <button
            id="checkout-btn"
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            disabled={cartItems.length === 0}
            className="pos-btn w-full saku-gradient-bg text-white font-bold py-3 text-sm shadow-md hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            Bayar Sekarang ({totalQty} item)
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {/* MODALS */}
      {configuringProduct && (
        <AddonSelectionModal
          product={configuringProduct}
          addons={addons}
          onClose={() => setConfiguringProduct(null)}
          onConfirm={handleConfirmAddon}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={(tx) => {
            setIsPaymentOpen(false);
            setCompletedTx(tx);
          }}
        />
      )}

      {completedTx && (
        <SuccessModal
          transaction={completedTx}
          onDone={() => setCompletedTx(null)}
        />
      )}
    </div>
  );
}
