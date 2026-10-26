import { db } from '../db';
import type { AddonVariantEntity } from '../db/schema';

export interface CreateAddonInput {
  name: string;
  variantType: string; // e.g. "Glaze", "Topping", "Ukuran", "Pedas"
  extraPrice: number;
  isActive?: boolean;
}

export interface UpdateAddonInput {
  name?: string;
  variantType?: string;
  extraPrice?: number;
  isActive?: boolean;
}

export const addonRepo = {
  async getAll(activeOnly: boolean = false): Promise<AddonVariantEntity[]> {
    if (activeOnly) {
      return db.addonVariants.where('isActive').equals(1 as any).toArray();
    }
    return db.addonVariants.toArray();
  },

  async getDistinctVariantTypes(): Promise<string[]> {
    const all = await db.addonVariants.toArray();
    const set = new Set<string>();
    for (const a of all) {
      if (a.variantType) set.add(a.variantType);
    }
    return Array.from(set).sort();
  },

  async getById(id: string): Promise<AddonVariantEntity | undefined> {
    return db.addonVariants.get(id);
  },

  async create(input: CreateAddonInput): Promise<AddonVariantEntity> {
    const cleanName = input.name.trim();
    const cleanType = input.variantType.trim() || 'Tambahan';

    if (!cleanName) {
      throw new Error('Nama varian tambahan wajib diisi');
    }

    // Check duplicate in same variantType
    const existing = await db.addonVariants
      .filter(
        (a) =>
          a.variantType.toLowerCase() === cleanType.toLowerCase() &&
          a.name.toLowerCase() === cleanName.toLowerCase()
      )
      .first();

    if (existing) {
      throw new Error(`Varian "${cleanName}" dalam jenis "${cleanType}" sudah ada`);
    }

    const now = new Date().toISOString();
    const entity: AddonVariantEntity = {
      id: crypto.randomUUID(),
      name: cleanName,
      variantType: cleanType,
      extraPrice: Math.max(0, Math.round(input.extraPrice || 0)),
      isActive: input.isActive !== undefined ? input.isActive : true,
      hasRecipe: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.addonVariants.add(entity);
    return entity;
  },

  async update(id: string, input: UpdateAddonInput): Promise<AddonVariantEntity> {
    const current = await db.addonVariants.get(id);
    if (!current) {
      throw new Error('Varian tambahan tidak ditemukan');
    }

    const cleanName = input.name !== undefined ? input.name.trim() : current.name;
    const cleanType = input.variantType !== undefined ? input.variantType.trim() : current.variantType;

    if (!cleanName) {
      throw new Error('Nama varian tambahan tidak boleh kosong');
    }

    if (cleanName.toLowerCase() !== current.name.toLowerCase() || cleanType.toLowerCase() !== current.variantType.toLowerCase()) {
      const duplicate = await db.addonVariants
        .filter(
          (a) =>
            a.id !== id &&
            a.variantType.toLowerCase() === cleanType.toLowerCase() &&
            a.name.toLowerCase() === cleanName.toLowerCase()
        )
        .first();
      if (duplicate) {
        throw new Error(`Varian "${cleanName}" dalam jenis "${cleanType}" sudah ada`);
      }
    }

    const now = new Date().toISOString();
    const updated: AddonVariantEntity = {
      ...current,
      name: cleanName,
      variantType: cleanType,
      extraPrice: input.extraPrice !== undefined ? Math.max(0, Math.round(input.extraPrice)) : current.extraPrice,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      updatedAt: now,
    };

    await db.addonVariants.put(updated);
    return updated;
  },

  async toggleActive(id: string): Promise<boolean> {
    const addon = await db.addonVariants.get(id);
    if (!addon) return false;
    const now = new Date().toISOString();
    await db.addonVariants.update(id, { isActive: !addon.isActive, updatedAt: now });
    return !addon.isActive;
  },

  async delete(id: string): Promise<{ success: boolean; reason?: string }> {
    // Check if addon was ever used in transaction item addons
    const usedCount = await db.transactionItemAddons.where('addonId').equals(id).count();
    if (usedCount > 0) {
      return {
        success: false,
        reason: `Varian tambahan ini sudah pernah digunakan dalam ${usedCount} transaksi. Varian hanya dapat dinonaktifkan.`,
      };
    }

    // Delete associated recipe lines if any
    await db.recipeLines.where('targetId').equals(id).delete();
    await db.addonVariants.delete(id);
    return { success: true };
  },
};
