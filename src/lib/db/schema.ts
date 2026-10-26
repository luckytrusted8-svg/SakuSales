/**
 * Dexie.js Database Schema and Entity Interfaces for SakuSales
 * Offline-first, Zero-dummy-data, Strict snapshot tracking
 */

export type UserRole = 'owner' | 'kasir';
export type TransactionStatus = 'lunas' | 'piutang' | 'batal';
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'receivable';
export type ReceivableStatus = 'belum_lunas' | 'lunas';
export type HppStatusType = 'lengkap' | 'belum_lengkap' | 'nonaktif';
export type IngredientUnit = 'gram' | 'ml' | 'pcs';
export type CategoryType = 'product' | 'expense';

export interface UserEntity {
  id: string;
  username: string; // 'owner' or cashier name
  name: string;
  role: UserRole;
  pinHash: string;
  pinSalt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettingsEntity {
  id: string; // always 'primary'
  storeName: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  receiptPaperSize: '58mm' | '80mm';
  receiptPrefix: string; // e.g. "SS" or "KA"
  enableHpp: boolean;
  autoLockMinutes: number; // default 5
  lastPrinterName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryEntity {
  id: string;
  name: string;
  type: CategoryType; // 'product' or 'expense'
  createdAt: string;
  updatedAt: string;
}

export interface ProductEntity {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  basePrice: number;
  isActive: boolean;
  hasRecipe?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddonVariantEntity {
  id: string;
  name: string;
  variantType: string; // e.g. "Glaze", "Topping", or custom user defined
  extraPrice: number;
  isActive: boolean;
  hasRecipe?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerEntity {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientEntity {
  id: string;
  name: string;
  baseUnit: IngredientUnit; // 'gram' | 'ml' | 'pcs'
  purchasePrice: number;
  packageSize: number; // e.g. 1000 for 1000 grams
  costPerUnit: number; // purchasePrice / packageSize
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeLineEntity {
  id: string;
  targetType: 'product' | 'addon';
  targetId: string; // productId or addonId
  ingredientId: string;
  ingredientNameSnapshot: string;
  baseUnitSnapshot: IngredientUnit;
  amount: number; // in base units
  createdAt: string;
  updatedAt: string;
}

export interface TransactionEntity {
  id: string;
  invoiceNumber: string; // formatted PREFIX-YYYYMMDD-0001
  date: string; // ISO date string
  dateOnly: string; // YYYY-MM-DD for fast index queries
  subtotal: number;
  discountType?: 'nominal' | 'percent';
  discountValue?: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  status: TransactionStatus; // 'lunas' | 'piutang' | 'batal'
  customerId?: string;
  customerNameSnapshot?: string;
  cashierId: string;
  cashierNameSnapshot: string;
  cancelReason?: string;
  canceledAt?: string;
  canceledBy?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItemEntity {
  id: string;
  transactionId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number; // base price snapshot
  qty: number;
  subtotal: number; // (unitPriceSnapshot + addons) * qty
  hppSnapshot: number; // per portion HPP
  hppStatus: HppStatusType; // 'lengkap' | 'belum_lengkap' | 'nonaktif'
  createdAt: string;
}

export interface TransactionItemAddonEntity {
  id: string;
  transactionItemId: string;
  transactionId: string;
  addonId: string;
  addonNameSnapshot: string;
  addonPriceSnapshot: number;
  addonHppSnapshot: number;
  createdAt: string;
}

export interface PaymentEntity {
  id: string;
  transactionId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  cashierId: string;
  notes?: string;
  createdAt: string;
}

export interface ReceivableRecordEntity {
  id: string;
  transactionId: string;
  customerName: string;
  phone?: string;
  totalDebt: number;
  paidAmount: number;
  remainingDebt: number;
  status: ReceivableStatus; // 'belum_lunas' | 'lunas'
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntity {
  id: string;
  date: string; // ISO date
  dateOnly: string; // YYYY-MM-DD
  categoryId: string;
  categoryNameSnapshot: string;
  amount: number;
  notes?: string;
  receiptPhotoUrl?: string; // compressed base64
  createdAt: string;
  updatedAt: string;
}

export interface OtherIncomeEntity {
  id: string;
  date: string;
  dateOnly: string;
  categoryNameSnapshot: string;
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntity {
  id: string;
  action: string;
  userId: string;
  userName: string;
  details: string;
  createdAt: string;
}
