'use client';

import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import type { ProductEntity, AddonVariantEntity } from '../../lib/db/schema';
import { formatRupiah } from '../../lib/format/rupiah';

interface AddonSelectionModalProps {
  product: ProductEntity;
  addons: AddonVariantEntity[];
  onClose: () => void;
  onConfirm: (selectedAddons: { addonId: string; name: string; extraPrice: number }[], notes: string) => void;
}

export const AddonSelectionModal: React.FC<AddonSelectionModalProps> = ({
  product,
  addons,
  onClose,
  onConfirm,
}) => {
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  // Group active addons by variantType
  const groupedAddons: Record<string, AddonVariantEntity[]> = {};
  for (const addon of addons) {
    if (!addon.isActive) continue;
    const type = addon.variantType || 'Tambahan';
    if (!groupedAddons[type]) {
      groupedAddons[type] = [];
    }
    groupedAddons[type].push(addon);
  }

  const toggleAddon = (id: string) => {
    const next = new Set(selectedAddonIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAddonIds(next);
  };

  const selectedList = addons.filter((a) => selectedAddonIds.has(a.id));
  const addonsTotal = selectedList.reduce((sum, a) => sum + a.extraPrice, 0);
  const totalUnitPrice = product.basePrice + addonsTotal;

  const handleAdd = () => {
    const formatted = selectedList.map((a) => ({
      addonId: a.id,
      name: a.name,
      extraPrice: a.extraPrice,
    }));
    onConfirm(formatted, notes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2747]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F2747] leading-snug">{product.name}</h2>
            <p className="text-xs text-[#1EB6E6] font-bold">
              Harga dasar: {formatRupiah(product.basePrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#0F2747] rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Addons List grouped by Type */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {Object.entries(groupedAddons).map(([type, items]) => (
            <div key={type} className="space-y-2">
              <h3 className="text-xs font-bold text-[#0F2747] uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-lg">
                Pilih {type}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const isSelected = selectedAddonIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleAddon(item.id)}
                      className={`pos-btn p-3 text-left justify-between rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-[#1EB6E6] bg-cyan-50/60 text-[#0F2747] font-bold shadow-2xs'
                          : 'border-[#E2E8F0] bg-white text-[#0F2747] hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-[11px] text-[#1EB6E6]">
                          {item.extraPrice > 0 ? `+${formatRupiah(item.extraPrice)}` : 'Gratis'}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'saku-gradient-bg border-transparent text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-[#0F2747] mb-1">
              Catatan Pesanan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pisah glaze, tidak terlalu manis"
              className="w-full px-3.5 py-2.5 bg-[#F5F8FB] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F2747]"
            />
          </div>
        </div>

        {/* Footer Summary & Submit */}
        <div className="border-t border-[#E2E8F0] pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#6B7280]">Total Satuan:</span>
            <span className="text-base font-extrabold text-[#0F2747]">
              {formatRupiah(totalUnitPrice)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="pos-btn w-1/3 bg-[#F5F8FB] text-[#0F2747] text-xs font-semibold"
            >
              Batal
            </button>
            <button
              id="confirm-addon-btn"
              type="button"
              onClick={handleAdd}
              className="pos-btn flex-1 saku-gradient-bg text-white text-xs font-bold shadow-md hover:opacity-95"
            >
              + Masukkan ke Keranjang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
