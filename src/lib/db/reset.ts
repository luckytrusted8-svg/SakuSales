import { db } from './index';

/**
 * Reset all transactional and master data
 * Strict rule: ZERO seed data inserted. Database will remain completely clean.
 */
export async function resetDatabaseAll(): Promise<void> {
  await db.transaction('rw', [
    db.users,
    db.storeSettings,
    db.categories,
    db.products,
    db.addonVariants,
    db.customers,
    db.ingredients,
    db.recipeLines,
    db.transactions,
    db.transactionItems,
    db.transactionItemAddons,
    db.payments,
    db.receivableRecords,
    db.expenses,
    db.otherIncomes,
    db.auditLogs,
  ], async () => {
    await Promise.all([
      db.users.clear(),
      db.storeSettings.clear(),
      db.categories.clear(),
      db.products.clear(),
      db.addonVariants.clear(),
      db.customers.clear(),
      db.ingredients.clear(),
      db.recipeLines.clear(),
      db.transactions.clear(),
      db.transactionItems.clear(),
      db.transactionItemAddons.clear(),
      db.payments.clear(),
      db.receivableRecords.clear(),
      db.expenses.clear(),
      db.otherIncomes.clear(),
      db.auditLogs.clear(),
    ]);
  });
}

/**
 * Reset only transactional data while preserving master products, categories, ingredients, and settings
 */
export async function resetTransactionsOnly(): Promise<void> {
  await db.transaction('rw', [
    db.transactions,
    db.transactionItems,
    db.transactionItemAddons,
    db.payments,
    db.receivableRecords,
    db.expenses,
    db.otherIncomes,
    db.auditLogs,
  ], async () => {
    await Promise.all([
      db.transactions.clear(),
      db.transactionItems.clear(),
      db.transactionItemAddons.clear(),
      db.payments.clear(),
      db.receivableRecords.clear(),
      db.expenses.clear(),
      db.otherIncomes.clear(),
      db.auditLogs.clear(),
    ]);
  });
}
