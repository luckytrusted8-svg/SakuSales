import { db } from '../db';
import type { ExpenseEntity, OtherIncomeEntity } from '../db/schema';
import { toLocalDateString } from '../format/date';

export interface CreateExpenseInput {
  date?: string; // ISO date, defaults to now
  categoryId: string;
  categoryName?: string;
  amount: number;
  notes?: string;
  receiptPhotoUrl?: string; // compressed base64
}

export interface CreateOtherIncomeInput {
  date?: string;
  categoryName: string;
  amount: number;
  notes?: string;
}

export const expenseRepo = {
  async getAll(): Promise<ExpenseEntity[]> {
    return db.expenses.orderBy('createdAt').reverse().toArray();
  },

  async getByDateRange(startDateOnly: string, endDateOnly: string): Promise<ExpenseEntity[]> {
    return db.expenses
      .where('dateOnly')
      .between(startDateOnly, endDateOnly, true, true)
      .toArray();
  },

  async create(input: CreateExpenseInput): Promise<ExpenseEntity> {
    if (input.amount <= 0) {
      throw new Error('Nominal pengeluaran harus lebih besar dari Rp 0');
    }

    let categoryName = input.categoryName;
    if (!categoryName && input.categoryId) {
      const cat = await db.categories.get(input.categoryId);
      categoryName = cat ? cat.name : 'Umum';
    }

    const now = new Date();
    const date = input.date ? new Date(input.date) : now;
    const dateOnly = toLocalDateString(date);
    const nowIso = now.toISOString();

    const entity: ExpenseEntity = {
      id: crypto.randomUUID(),
      date: date.toISOString(),
      dateOnly,
      categoryId: input.categoryId,
      categoryNameSnapshot: categoryName || 'Pengeluaran',
      amount: Math.round(input.amount),
      notes: input.notes?.trim() || '',
      receiptPhotoUrl: input.receiptPhotoUrl || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.expenses.add(entity);
    return entity;
  },

  async update(id: string, input: Partial<CreateExpenseInput>): Promise<ExpenseEntity> {
    const current = await db.expenses.get(id);
    if (!current) throw new Error('Pengeluaran tidak ditemukan');

    const nowIso = new Date().toISOString();
    const date = input.date ? new Date(input.date) : new Date(current.date);
    const dateOnly = toLocalDateString(date);

    const updated: ExpenseEntity = {
      ...current,
      date: date.toISOString(),
      dateOnly,
      categoryId: input.categoryId !== undefined ? input.categoryId : current.categoryId,
      categoryNameSnapshot: input.categoryName !== undefined ? input.categoryName : current.categoryNameSnapshot,
      amount: input.amount !== undefined ? Math.round(input.amount) : current.amount,
      notes: input.notes !== undefined ? input.notes.trim() : current.notes,
      receiptPhotoUrl: input.receiptPhotoUrl !== undefined ? input.receiptPhotoUrl : current.receiptPhotoUrl,
      updatedAt: nowIso,
    };

    await db.expenses.put(updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    await db.expenses.delete(id);
    return true;
  },

  // Other Incomes (Pemasukan lain di luar penjualan)
  async getAllIncomes(): Promise<OtherIncomeEntity[]> {
    return db.otherIncomes.orderBy('createdAt').reverse().toArray();
  },

  async createIncome(input: CreateOtherIncomeInput): Promise<OtherIncomeEntity> {
    if (input.amount <= 0) {
      throw new Error('Nominal pemasukan harus lebih besar dari Rp 0');
    }

    const now = new Date();
    const date = input.date ? new Date(input.date) : now;
    const dateOnly = toLocalDateString(date);
    const nowIso = now.toISOString();

    const entity: OtherIncomeEntity = {
      id: crypto.randomUUID(),
      date: date.toISOString(),
      dateOnly,
      categoryNameSnapshot: input.categoryName.trim() || 'Pemasukan Lain',
      amount: Math.round(input.amount),
      notes: input.notes?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.otherIncomes.add(entity);
    return entity;
  },

  async deleteIncome(id: string): Promise<boolean> {
    await db.otherIncomes.delete(id);
    return true;
  },
};
