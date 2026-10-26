import { db } from '../db';
import type {
  TransactionEntity,
  TransactionItemEntity,
  TransactionItemAddonEntity,
  PaymentEntity,
  ReceivableRecordEntity,
  TransactionStatus,
  PaymentMethod,
  HppStatusType,
} from '../db/schema';
import { formatInvoiceNumber, extractInvoiceSequence } from '../domain/invoice';
import { toLocalDateString, toInvoiceDatePart } from '../format/date';
import { settingsRepo } from './settingsRepo';

export interface CreateTransactionItemInput {
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number; // base product price
  qty: number;
  subtotal: number;
  hppSnapshot?: number;
  hppStatus?: HppStatusType;
  addons?: {
    addonId: string;
    addonNameSnapshot: string;
    addonPriceSnapshot: number;
    addonHppSnapshot?: number;
  }[];
}

export interface CreateTransactionInput {
  subtotal: number;
  discountType?: 'nominal' | 'percent';
  discountValue?: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  items: CreateTransactionItemInput[];
}

export interface CancelTransactionInput {
  transactionId: string;
  canceledByUserId: string;
  canceledByUserName: string;
  reason: string;
}

export const transactionRepo = {
  /**
   * Generate next invoice number for today atomically
   */
  async generateNextInvoiceNumber(): Promise<string> {
    const settings = await settingsRepo.get();
    const prefix = settings?.receiptPrefix || 'SS';
    const today = new Date();
    const todayDatePart = toInvoiceDatePart(today);
    const todayDateOnly = toLocalDateString(today);

    // Find highest sequence from today's transactions
    const todayTransactions = await db.transactions
      .where('dateOnly')
      .equals(todayDateOnly)
      .toArray();

    let maxSeq = 0;
    for (const tx of todayTransactions) {
      const seq = extractInvoiceSequence(tx.invoiceNumber, todayDatePart);
      if (seq !== null && seq > maxSeq) {
        maxSeq = seq;
      }
    }

    const nextSeq = maxSeq + 1;
    return formatInvoiceNumber(prefix, today, nextSeq);
  },

  /**
   * Create transaction atomically across transactions, items, addons, payments, and receivables
   */
  async create(input: CreateTransactionInput): Promise<TransactionEntity> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    const invoiceNumber = await this.generateNextInvoiceNumber();
    const now = new Date();
    const nowIso = now.toISOString();
    const dateOnly = toLocalDateString(now);

    const isReceivable = input.paymentMethod === 'receivable';
    const status: TransactionStatus = isReceivable ? 'piutang' : 'lunas';

    const transactionId = crypto.randomUUID();

    const transactionEntity: TransactionEntity = {
      id: transactionId,
      invoiceNumber,
      date: nowIso,
      dateOnly,
      subtotal: Math.max(0, Math.round(input.subtotal)),
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: Math.max(0, Math.round(input.discountAmount || 0)),
      grandTotal: Math.max(0, Math.round(input.grandTotal)),
      paymentMethod: input.paymentMethod,
      amountPaid: Math.max(0, Math.round(input.amountPaid || 0)),
      changeAmount: Math.max(0, Math.round(input.changeAmount || 0)),
      status,
      customerId: input.customerId,
      customerNameSnapshot: input.customerName?.trim() || '',
      cashierId: input.cashierId,
      cashierNameSnapshot: input.cashierName.trim() || 'Kasir',
      deletedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const itemEntities: TransactionItemEntity[] = [];
    const addonEntities: TransactionItemAddonEntity[] = [];

    for (const item of input.items) {
      const itemId = crypto.randomUUID();
      itemEntities.push({
        id: itemId,
        transactionId,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        unitPriceSnapshot: item.unitPriceSnapshot,
        qty: Math.max(1, Math.round(item.qty)),
        subtotal: item.subtotal,
        hppSnapshot: item.hppSnapshot || 0,
        hppStatus: item.hppStatus || 'nonaktif',
        createdAt: nowIso,
      });

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          addonEntities.push({
            id: crypto.randomUUID(),
            transactionItemId: itemId,
            transactionId,
            addonId: addon.addonId,
            addonNameSnapshot: addon.addonNameSnapshot,
            addonPriceSnapshot: addon.addonPriceSnapshot,
            addonHppSnapshot: addon.addonHppSnapshot || 0,
            createdAt: nowIso,
          });
        }
      }
    }

    // Payment record
    const paymentEntity: PaymentEntity = {
      id: crypto.randomUUID(),
      transactionId,
      amount: isReceivable ? Math.max(0, input.amountPaid) : transactionEntity.grandTotal,
      paymentMethod: input.paymentMethod,
      paymentDate: nowIso,
      cashierId: input.cashierId,
      createdAt: nowIso,
    };

    // Receivable record if unpaid / piutang
    let receivableEntity: ReceivableRecordEntity | null = null;
    if (isReceivable) {
      const remaining = Math.max(0, transactionEntity.grandTotal - transactionEntity.amountPaid);
      receivableEntity = {
        id: crypto.randomUUID(),
        transactionId,
        customerName: input.customerName?.trim() || 'Pelanggan Piutang',
        phone: input.customerPhone?.trim() || '',
        totalDebt: transactionEntity.grandTotal,
        paidAmount: transactionEntity.amountPaid,
        remainingDebt: remaining,
        status: remaining === 0 ? 'lunas' : 'belum_lunas',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    // Save customer name for autocomplete suggestions
    if (input.customerName?.trim()) {
      const cleanName = input.customerName.trim();
      const existingCust = await db.customers
        .filter((c) => c.name.toLowerCase() === cleanName.toLowerCase())
        .first();
      if (!existingCust) {
        await db.customers.add({
          id: crypto.randomUUID(),
          name: cleanName,
          phone: input.customerPhone?.trim() || '',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    // ATOMIC DEXIE TRANSACTION WRITE
    await db.transaction(
      'rw',
      [
        db.transactions,
        db.transactionItems,
        db.transactionItemAddons,
        db.payments,
        db.receivableRecords,
      ],
      async () => {
        await db.transactions.add(transactionEntity);
        await db.transactionItems.bulkAdd(itemEntities);
        if (addonEntities.length > 0) {
          await db.transactionItemAddons.bulkAdd(addonEntities);
        }
        await db.payments.add(paymentEntity);
        if (receivableEntity) {
          await db.receivableRecords.add(receivableEntity);
        }
      }
    );

    return transactionEntity;
  },

  async getById(id: string): Promise<{
    transaction: TransactionEntity;
    items: (TransactionItemEntity & { addons: TransactionItemAddonEntity[] })[];
    payments: PaymentEntity[];
  } | null> {
    const transaction = await db.transactions.get(id);
    if (!transaction) return null;

    const items = await db.transactionItems.where('transactionId').equals(id).toArray();
    const addons = await db.transactionItemAddons.where('transactionId').equals(id).toArray();
    const payments = await db.payments.where('transactionId').equals(id).toArray();

    const enrichedItems = items.map((item) => ({
      ...item,
      addons: addons.filter((a) => a.transactionItemId === item.id),
    }));

    return {
      transaction,
      items: enrichedItems,
      payments,
    };
  },

  async getRecent(limit: number = 50, dateOnlyFilter?: string): Promise<TransactionEntity[]> {
    let collection = db.transactions.orderBy('createdAt').reverse();
    if (dateOnlyFilter) {
      return db.transactions
        .where('dateOnly')
        .equals(dateOnlyFilter)
        .reverse()
        .sortBy('createdAt');
    }
    return collection.limit(limit).toArray();
  },

  async cancelTransaction(input: CancelTransactionInput): Promise<boolean> {
    const tx = await db.transactions.get(input.transactionId);
    if (!tx) throw new Error('Transaksi tidak ditemukan');
    if (tx.status === 'batal') throw new Error('Transaksi sudah berstatus batal');

    const nowIso = new Date().toISOString();

    await db.transaction('rw', [db.transactions, db.receivableRecords, db.auditLogs], async () => {
      await db.transactions.update(input.transactionId, {
        status: 'batal',
        cancelReason: input.reason.trim(),
        canceledAt: nowIso,
        canceledBy: input.canceledByUserName,
        updatedAt: nowIso,
      });

      // Update associated receivable record if any
      const receivable = await db.receivableRecords
        .where('transactionId')
        .equals(input.transactionId)
        .first();
      if (receivable) {
        await db.receivableRecords.update(receivable.id, {
          status: 'lunas',
          remainingDebt: 0,
          updatedAt: nowIso,
        });
      }

      // Add audit log
      await db.auditLogs.add({
        id: crypto.randomUUID(),
        action: 'CANCEL_TRANSACTION',
        userId: input.canceledByUserId,
        userName: input.canceledByUserName,
        details: `Batalkan nota ${tx.invoiceNumber} senilai Rp ${tx.grandTotal.toLocaleString('id-ID')}. Alasan: ${input.reason}`,
        createdAt: nowIso,
      });
    });

    return true;
  },
};
