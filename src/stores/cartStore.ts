import { create } from 'zustand';
import type { CartItemModel, DiscountConfig, AddonItemSelection } from '../lib/domain/pricing';
import { calculateGrandTotal } from '../lib/domain/pricing';
import type { PaymentMethod } from '../lib/db/schema';

interface CartState {
  items: CartItemModel[];
  discount: DiscountConfig | null;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;

  // Actions
  addItem: (item: {
    productId: string;
    name: string;
    basePrice: number;
    addons?: AddonItemSelection[];
    qty?: number;
    notes?: string;
    baseHpp?: number;
    addonHppTotal?: number;
    isHppComplete?: boolean;
  }) => void;

  updateItemQty: (index: number, newQty: number) => void;
  removeItem: (index: number) => void;
  setDiscount: (discount: DiscountConfig | null) => void;
  setCustomer: (name: string, phone?: string) => void;
  setPayment: (method: PaymentMethod, amountPaid: number) => void;
  clearCart: () => void;

  // Getters
  getTotals: () => {
    grossTotal: number;
    discountAmount: number;
    grandTotal: number;
    totalQty: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: null,
  customerName: '',
  customerPhone: '',
  paymentMethod: 'cash',
  amountPaid: 0,

  addItem: (newItem) => {
    const { items } = get();
    const addons = newItem.addons || [];
    const qtyToAdd = newItem.qty && newItem.qty > 0 ? newItem.qty : 1;

    // Check if item with EXACT same product AND exact same addons already exists
    const addonSignature = addons
      .map((a) => `${a.addonId}:${a.extraPrice}:${a.qty || 1}`)
      .sort()
      .join('|');

    const existingIndex = items.findIndex((it) => {
      if (it.productId !== newItem.productId) return false;
      const itSignature = (it.addons || [])
        .map((a) => `${a.addonId}:${a.extraPrice}:${a.qty || 1}`)
        .sort()
        .join('|');
      return itSignature === addonSignature && (it.notes || '') === (newItem.notes || '');
    });

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qty += qtyToAdd;
      set({ items: updated });
    } else {
      const itemModel: CartItemModel = {
        productId: newItem.productId,
        name: newItem.name,
        basePrice: newItem.basePrice,
        qty: qtyToAdd,
        addons,
        notes: newItem.notes,
        baseHpp: newItem.baseHpp,
        addonHppTotal: newItem.addonHppTotal,
        isHppComplete: newItem.isHppComplete,
      };
      set({ items: [...items, itemModel] });
    }
  },

  updateItemQty: (index, newQty) => {
    const { items } = get();
    if (index < 0 || index >= items.length) return;

    if (newQty <= 0) {
      const updated = items.filter((_, i) => i !== index);
      set({ items: updated });
    } else {
      const updated = [...items];
      updated[index].qty = Math.round(newQty);
      set({ items: updated });
    }
  },

  removeItem: (index) => {
    const { items } = get();
    set({ items: items.filter((_, i) => i !== index) });
  },

  setDiscount: (discount) => {
    set({ discount });
  },

  setCustomer: (name, phone = '') => {
    set({ customerName: name, customerPhone: phone });
  },

  setPayment: (method, amountPaid) => {
    set({ paymentMethod: method, amountPaid: Math.max(0, amountPaid) });
  },

  clearCart: () => {
    set({
      items: [],
      discount: null,
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      amountPaid: 0,
    });
  },

  getTotals: () => {
    const { items, discount } = get();
    return calculateGrandTotal(items, discount);
  },
}));
