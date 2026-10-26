import { db } from '../db';
import type {
  IngredientEntity,
  RecipeLineEntity,
  IngredientUnit,
} from '../db/schema';
import { calculateIngredientCostPerUnit } from '../domain/hpp';

export interface CreateIngredientInput {
  name: string;
  baseUnit: IngredientUnit; // 'gram' | 'ml' | 'pcs'
  purchasePrice: number;
  packageSize: number;
}

export interface UpdateIngredientInput {
  name?: string;
  baseUnit?: IngredientUnit;
  purchasePrice?: number;
  packageSize?: number;
  isActive?: boolean;
}

export interface SetRecipeInput {
  targetType: 'product' | 'addon';
  targetId: string;
  lines: {
    ingredientId: string;
    amount: number;
  }[];
}

export const ingredientRepo = {
  async getAllIngredients(activeOnly: boolean = false): Promise<IngredientEntity[]> {
    if (activeOnly) {
      return db.ingredients.where('isActive').equals(1 as any).toArray();
    }
    return db.ingredients.toArray();
  },

  async getIngredientById(id: string): Promise<IngredientEntity | undefined> {
    return db.ingredients.get(id);
  },

  async createIngredient(input: CreateIngredientInput): Promise<IngredientEntity> {
    const cleanName = input.name.trim();
    if (!cleanName) throw new Error('Nama bahan baku wajib diisi');
    if (input.packageSize <= 0) throw new Error('Isi kemasan harus lebih besar dari 0');
    if (input.purchasePrice < 0) throw new Error('Harga beli tidak boleh negatif');

    const costPerUnit = calculateIngredientCostPerUnit(input.purchasePrice, input.packageSize);
    const nowIso = new Date().toISOString();

    const entity: IngredientEntity = {
      id: crypto.randomUUID(),
      name: cleanName,
      baseUnit: input.baseUnit,
      purchasePrice: Math.round(input.purchasePrice),
      packageSize: input.packageSize,
      costPerUnit,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.ingredients.add(entity);
    return entity;
  },

  async updateIngredient(id: string, input: UpdateIngredientInput): Promise<IngredientEntity> {
    const current = await db.ingredients.get(id);
    if (!current) throw new Error('Bahan baku tidak ditemukan');

    const purchasePrice = input.purchasePrice !== undefined ? Math.round(input.purchasePrice) : current.purchasePrice;
    const packageSize = input.packageSize !== undefined ? input.packageSize : current.packageSize;
    const costPerUnit = calculateIngredientCostPerUnit(purchasePrice, packageSize);
    const nowIso = new Date().toISOString();

    const updated: IngredientEntity = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      baseUnit: input.baseUnit !== undefined ? input.baseUnit : current.baseUnit,
      purchasePrice,
      packageSize,
      costPerUnit,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      updatedAt: nowIso,
    };

    await db.ingredients.put(updated);
    return updated;
  },

  async deleteIngredient(id: string): Promise<{ success: boolean; reason?: string }> {
    // Aturan 13: Bahan yang sudah dipakai di resep tidak boleh dihapus. Cukup dinonaktifkan.
    const usedInRecipes = await db.recipeLines.where('ingredientId').equals(id).count();
    if (usedInRecipes > 0) {
      return {
        success: false,
        reason: `Bahan ini sudah digunakan di ${usedInRecipes} resep. Bahan tidak boleh dihapus, silakan nonaktifkan saja.`,
      };
    }

    await db.ingredients.delete(id);
    return { success: true };
  },

  // Recipe management
  async getRecipe(targetType: 'product' | 'addon', targetId: string): Promise<RecipeLineEntity[]> {
    return db.recipeLines
      .where('targetId')
      .equals(targetId)
      .toArray();
  },

  async saveRecipe(input: SetRecipeInput): Promise<RecipeLineEntity[]> {
    const nowIso = new Date().toISOString();
    const newEntities: RecipeLineEntity[] = [];

    for (const line of input.lines) {
      const ing = await db.ingredients.get(line.ingredientId);
      if (!ing) continue;

      newEntities.push({
        id: crypto.randomUUID(),
        targetType: input.targetType,
        targetId: input.targetId,
        ingredientId: line.ingredientId,
        ingredientNameSnapshot: ing.name,
        baseUnitSnapshot: ing.baseUnit,
        amount: Math.max(0, line.amount),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    await db.transaction('rw', [db.recipeLines, db.products, db.addonVariants], async () => {
      // 1. Remove old recipe lines
      await db.recipeLines.where('targetId').equals(input.targetId).delete();
      // 2. Add new recipe lines
      if (newEntities.length > 0) {
        await db.recipeLines.bulkAdd(newEntities);
      }
      // 3. Update hasRecipe flag on target
      const hasRecipe = newEntities.length > 0;
      if (input.targetType === 'product') {
        await db.products.update(input.targetId, { hasRecipe });
      } else {
        await db.addonVariants.update(input.targetId, { hasRecipe });
      }
    });

    return newEntities;
  },
};
