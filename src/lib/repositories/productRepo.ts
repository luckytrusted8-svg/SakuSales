import { db } from '../db';
import type { ProductEntity } from '../db/schema';

export interface CreateProductInput {
  name: string;
  categoryId?: string;
  basePrice: number;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  categoryId?: string;
  basePrice?: number;
  isActive?: boolean;
}

export const productRepo = {
  async getAll(activeOnly: boolean = false): Promise<ProductEntity[]> {
    if (activeOnly) {
      return db.products.where('isActive').equals(1 as any).toArray();
    }
    return db.products.toArray();
  },

  async getById(id: string): Promise<ProductEntity | undefined> {
    return db.products.get(id);
  },

  async create(input: CreateProductInput): Promise<ProductEntity> {
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('Nama produk wajib diisi');
    }
    if (input.basePrice <= 0) {
      throw new Error('Harga produk harus lebih besar dari Rp 0');
    }

    // Check duplicate name
    const existing = await db.products
      .filter((p) => p.name.toLowerCase() === cleanName.toLowerCase())
      .first();

    if (existing) {
      throw new Error(`Produk dengan nama "${cleanName}" sudah ada`);
    }

    let categoryName = '';
    if (input.categoryId) {
      const cat = await db.categories.get(input.categoryId);
      if (cat) categoryName = cat.name;
    }

    const now = new Date().toISOString();
    const entity: ProductEntity = {
      id: crypto.randomUUID(),
      name: cleanName,
      categoryId: input.categoryId || '',
      categoryName,
      basePrice: Math.round(input.basePrice),
      isActive: input.isActive !== undefined ? input.isActive : true,
      hasRecipe: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.products.add(entity);
    return entity;
  },

  async update(id: string, input: UpdateProductInput): Promise<ProductEntity> {
    const current = await db.products.get(id);
    if (!current) {
      throw new Error('Produk tidak ditemukan');
    }

    const cleanName = input.name !== undefined ? input.name.trim() : current.name;
    if (!cleanName) {
      throw new Error('Nama produk tidak boleh kosong');
    }

    const basePrice = input.basePrice !== undefined ? Math.round(input.basePrice) : current.basePrice;
    if (basePrice <= 0) {
      throw new Error('Harga produk harus lebih besar dari Rp 0');
    }

    if (cleanName.toLowerCase() !== current.name.toLowerCase()) {
      const duplicate = await db.products
        .filter((p) => p.id !== id && p.name.toLowerCase() === cleanName.toLowerCase())
        .first();
      if (duplicate) {
        throw new Error(`Produk dengan nama "${cleanName}" sudah ada`);
      }
    }

    let categoryName = current.categoryName;
    if (input.categoryId !== undefined) {
      if (input.categoryId) {
        const cat = await db.categories.get(input.categoryId);
        categoryName = cat ? cat.name : '';
      } else {
        categoryName = '';
      }
    }

    const now = new Date().toISOString();
    const updated: ProductEntity = {
      ...current,
      name: cleanName,
      categoryId: input.categoryId !== undefined ? input.categoryId : current.categoryId,
      categoryName,
      basePrice,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      updatedAt: now,
    };

    await db.products.put(updated);
    return updated;
  },

  async toggleActive(id: string): Promise<boolean> {
    const product = await db.products.get(id);
    if (!product) return false;
    const now = new Date().toISOString();
    await db.products.update(id, { isActive: !product.isActive, updatedAt: now });
    return !product.isActive;
  },

  async delete(id: string): Promise<{ success: boolean; reason?: string }> {
    // Check if product was EVER used in transaction items
    const usedInTx = await db.transactionItems.where('productId').equals(id).count();
    if (usedInTx > 0) {
      return {
        success: false,
        reason: `Produk ini sudah pernah terjual dalam ${usedInTx} transaksi. Produk hanya dapat dinonaktifkan agar riwayat transaksi tetap rapi.`,
      };
    }

    // Check if used in recipes
    const usedInRecipe = await db.recipeLines
      .where('targetId')
      .equals(id)
      .count();
    if (usedInRecipe > 0) {
      await db.recipeLines.where('targetId').equals(id).delete();
    }

    await db.products.delete(id);
    return { success: true };
  },
};
