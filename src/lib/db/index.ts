import Dexie, { type Table } from 'dexie';
import type {
  UserEntity,
  StoreSettingsEntity,
  CategoryEntity,
  ProductEntity,
  AddonVariantEntity,
  CustomerEntity,
  IngredientEntity,
  RecipeLineEntity,
  TransactionEntity,
  TransactionItemEntity,
  TransactionItemAddonEntity,
  PaymentEntity,
  ReceivableRecordEntity,
  ExpenseEntity,
  OtherIncomeEntity,
  AuditLogEntity,
} from './schema';

export class SakuSalesDatabase extends Dexie {
  users!: Table<UserEntity, string>;
  storeSettings!: Table<StoreSettingsEntity, string>;
  categories!: Table<CategoryEntity, string>;
  products!: Table<ProductEntity, string>;
  addonVariants!: Table<AddonVariantEntity, string>;
  customers!: Table<CustomerEntity, string>;
  ingredients!: Table<IngredientEntity, string>;
  recipeLines!: Table<RecipeLineEntity, string>;
  transactions!: Table<TransactionEntity, string>;
  transactionItems!: Table<TransactionItemEntity, string>;
  transactionItemAddons!: Table<TransactionItemAddonEntity, string>;
  payments!: Table<PaymentEntity, string>;
  receivableRecords!: Table<ReceivableRecordEntity, string>;
  expenses!: Table<ExpenseEntity, string>;
  otherIncomes!: Table<OtherIncomeEntity, string>;
  auditLogs!: Table<AuditLogEntity, string>;

  constructor() {
    super('SakuSalesDB');

    // Version 1 Schema with fast search indices
    this.version(1).stores({
      users: 'id, username, role, createdAt',
      storeSettings: 'id',
      categories: 'id, name, type, createdAt',
      products: 'id, name, categoryId, basePrice, isActive, createdAt',
      addonVariants: 'id, name, variantType, extraPrice, isActive, createdAt',
      customers: 'id, name, phone, createdAt',
      ingredients: 'id, name, baseUnit, costPerUnit, isActive, updatedAt',
      recipeLines: 'id, targetType, targetId, ingredientId, createdAt',
      transactions: 'id, invoiceNumber, date, dateOnly, status, customerNameSnapshot, cashierId, paymentMethod, deletedAt, createdAt',
      transactionItems: 'id, transactionId, productId, hppStatus, createdAt',
      transactionItemAddons: 'id, transactionItemId, transactionId, addonId, createdAt',
      payments: 'id, transactionId, paymentMethod, paymentDate, createdAt',
      receivableRecords: 'id, transactionId, customerName, status, dueDate, createdAt',
      expenses: 'id, date, dateOnly, categoryId, createdAt',
      otherIncomes: 'id, date, dateOnly, createdAt',
      auditLogs: 'id, action, userId, createdAt',
    });
  }
}

// Singleton database instance
export const db = new SakuSalesDatabase();
