import { db } from '../db';
import type { ReceivableRecordEntity, PaymentEntity } from '../db/schema';

export interface RecordInstallmentInput {
  receivableId: string;
  amount: number;
  paymentMethod: 'cash' | 'qris' | 'transfer';
  cashierId: string;
  notes?: string;
}

export const receivableRepo = {
  async getAll(statusFilter?: 'belum_lunas' | 'lunas'): Promise<ReceivableRecordEntity[]> {
    if (statusFilter) {
      return db.receivableRecords
        .where('status')
        .equals(statusFilter)
        .reverse()
        .sortBy('createdAt');
    }
    return db.receivableRecords.orderBy('createdAt').reverse().toArray();
  },

  async getById(id: string): Promise<ReceivableRecordEntity | undefined> {
    return db.receivableRecords.get(id);
  },

  async recordInstallment(input: RecordInstallmentInput): Promise<{
    receivable: ReceivableRecordEntity;
    isFullyPaid: boolean;
  }> {
    const receivable = await db.receivableRecords.get(input.receivableId);
    if (!receivable) throw new Error('Data piutang tidak ditemukan');
    if (receivable.status === 'lunas') throw new Error('Piutang ini sudah lunas');
    if (input.amount <= 0) throw new Error('Nominal cicilan harus lebih besar dari Rp 0');

    const paymentAmount = Math.min(input.amount, receivable.remainingDebt);
    const newPaidAmount = receivable.paidAmount + paymentAmount;
    const newRemainingDebt = Math.max(0, receivable.remainingDebt - paymentAmount);
    const isFullyPaid = newRemainingDebt === 0;
    const nowIso = new Date().toISOString();

    const paymentEntity: PaymentEntity = {
      id: crypto.randomUUID(),
      transactionId: receivable.transactionId,
      amount: paymentAmount,
      paymentMethod: input.paymentMethod,
      paymentDate: nowIso,
      cashierId: input.cashierId,
      notes: input.notes?.trim() || `Cicilan piutang: ${receivable.customerName}`,
      createdAt: nowIso,
    };

    await db.transaction('rw', [db.receivableRecords, db.transactions, db.payments], async () => {
      // 1. Update receivable record
      await db.receivableRecords.update(receivable.id, {
        paidAmount: newPaidAmount,
        remainingDebt: newRemainingDebt,
        status: isFullyPaid ? 'lunas' : 'belum_lunas',
        updatedAt: nowIso,
      });

      // 2. Add payment record
      await db.payments.add(paymentEntity);

      // 3. Update original transaction status & amountPaid if fully paid
      if (isFullyPaid) {
        const tx = await db.transactions.get(receivable.transactionId);
        if (tx) {
          await db.transactions.update(tx.id, {
            status: 'lunas',
            amountPaid: tx.grandTotal,
            updatedAt: nowIso,
          });
        }
      }
    });

    const updated = (await db.receivableRecords.get(receivable.id))!;
    return {
      receivable: updated,
      isFullyPaid,
    };
  },
};
