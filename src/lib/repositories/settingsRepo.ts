import { db } from '../db';
import type { StoreSettingsEntity } from '../db/schema';

export const PRIMARY_SETTINGS_ID = 'primary';

export interface UpdateSettingsInput {
  storeName: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  receiptPaperSize?: '58mm' | '80mm';
  receiptPrefix?: string;
  enableHpp?: boolean;
  autoLockMinutes?: number;
  lastPrinterName?: string;
}

export const settingsRepo = {
  async get(): Promise<StoreSettingsEntity | undefined> {
    return db.storeSettings.get(PRIMARY_SETTINGS_ID);
  },

  async isSetupCompleted(): Promise<boolean> {
    const settings = await db.storeSettings.get(PRIMARY_SETTINGS_ID);
    const owner = await db.users.where('role').equals('owner').first();
    return Boolean(settings && settings.storeName && owner);
  },

  async upsert(input: UpdateSettingsInput): Promise<StoreSettingsEntity> {
    const existing = await db.storeSettings.get(PRIMARY_SETTINGS_ID);
    const now = new Date().toISOString();

    // Generate 2-3 letter uppercase prefix if not provided
    const defaultPrefix = (input.storeName || 'SakuSales')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'SS';

    const entity: StoreSettingsEntity = {
      id: PRIMARY_SETTINGS_ID,
      storeName: input.storeName.trim(),
      address: input.address?.trim() || '',
      phone: input.phone?.trim() || '',
      receiptFooter: input.receiptFooter?.trim() || 'Terima kasih atas kunjungan Anda!',
      receiptPaperSize: input.receiptPaperSize || existing?.receiptPaperSize || '58mm',
      receiptPrefix: (input.receiptPrefix?.trim().toUpperCase() || existing?.receiptPrefix || defaultPrefix),
      enableHpp: input.enableHpp !== undefined ? input.enableHpp : (existing?.enableHpp ?? false),
      autoLockMinutes: input.autoLockMinutes !== undefined ? input.autoLockMinutes : (existing?.autoLockMinutes ?? 5),
      lastPrinterName: input.lastPrinterName ?? existing?.lastPrinterName,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await db.storeSettings.put(entity);
    return entity;
  },
};
