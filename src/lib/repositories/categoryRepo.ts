import { db } from '../db';
import type { CategoryEntity, CategoryType } from '../db/schema';

export const categoryRepo = {
  async getAll(type?: CategoryType): Promise<CategoryEntity[]> {
    if (type) {
      return db.categories.where('type').equals(type).toArray();
    }
    return db.categories.toArray();
  },

  async getById(id: string): Promise<CategoryEntity | undefined> {
    return db.categories.get(id);
  },

  async create(name: string, type: CategoryType): Promise<CategoryEntity> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Nama kategori wajib diisi');
    }

    // Check duplicate in same type
    const existing = await db.categories
      .where('type')
      .equals(type)
      .filter((c) => c.name.toLowerCase() === cleanName.toLowerCase())
      .first();

    if (existing) {
      throw new Error(`Kategori "${cleanName}" sudah ada`);
    }

    const now = new Date().toISOString();
    const entity: CategoryEntity = {
      id: crypto.randomUUID(),
      name: cleanName,
      type,
      createdAt: now,
      updatedAt: now,
    };

    await db.categories.add(entity);
    return entity;
  },

  async update(id: string, name: string): Promise<CategoryEntity> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Nama kategori tidak boleh kosong');
    }

    const current = await db.categories.get(id);
    if (!current) {
      throw new Error('Kategori tidak ditemukan');
    }

    const duplicate = await db.categories
      .where('type')
      .equals(current.type)
      .filter((c) => c.id !== id && c.name.toLowerCase() === cleanName.toLowerCase())
      .first();

    if (duplicate) {
      throw new Error(`Kategori "${cleanName}" sudah ada`);
    }

    const now = new Date().toISOString();
    await db.categories.update(id, { name: cleanName, updatedAt: now });
    return { ...current, name: cleanName, updatedAt: now };
  },

  async delete(id: string): Promise<{ success: boolean; reason?: string }> {
    // Check if used by any products
    const productCount = await db.products.where('categoryId').equals(id).count();
    if (productCount > 0) {
      return {
        success: false,
        reason: `Kategori ini masih digunakan oleh ${productCount} produk. Pindahkan kategori produk terlebih dahulu.`,
      };
    }

    // Check if used by expenses
    const expenseCount = await db.expenses.where('categoryId').equals(id).count();
    if (expenseCount > 0) {
      return {
        success: false,
        reason: `Kategori ini sudah pernah dicatat di ${expenseCount} pengeluaran. Kategori tidak dapat dihapus.`,
      };
    }

    await db.categories.delete(id);
    return { success: true };
  },
};
