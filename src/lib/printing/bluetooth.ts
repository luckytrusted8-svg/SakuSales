/**
 * Web Bluetooth Printer Manager with iOS fallback awareness
 */
import { generateEscPosBytes, type PrintableReceiptData } from './escpos';

// Common thermal printer Bluetooth Service & Characteristic UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

export const bluetoothPrinter = {
  /**
   * Check if Web Bluetooth is supported by current browser/OS
   * Notice: iOS Safari does NOT support Web Bluetooth API.
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  },

  /**
   * Detect if current platform is iOS (Safari/Chrome on iOS)
   */
  isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  /**
   * Request Bluetooth device and print ESC/POS bytes
   */
  async printReceipt(
    data: PrintableReceiptData,
    paperSize: '58mm' | '80mm' = '58mm'
  ): Promise<{ success: boolean; printerName?: string; error?: string }> {
    if (!this.isSupported()) {
      if (this.isIOS()) {
        return {
          success: false,
          error: 'Web Bluetooth tidak didukung oleh Apple iOS Safari. Silakan gunakan tombol "Cetak via Browser (AirPrint)" atau "Kirim ke WhatsApp".',
        };
      }
      return {
        success: false,
        error: 'Web Bluetooth tidak didukung oleh browser ini. Gunakan Google Chrome di HP Android atau Laptop.',
      };
    }

    try {
      const bytes = generateEscPosBytes(data, paperSize);

      // Request device with printer filter or acceptAllDevices
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device || !device.gatt) {
        throw new Error('Gagal menghubungkan ke perangkat Bluetooth');
      }

      const server = await device.gatt.connect();

      // Find compatible service and writable characteristic
      let writeChar: any = null;
      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // Continue to next service candidate
        }
      }

      if (!writeChar) {
        // Fallback: try finding first writable characteristic across all services
        const services = await server.getPrimaryServices();
        for (const s of services) {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        }
      }

      if (!writeChar) {
        throw new Error('Tidak ditemukan karakteristik tulis pada printer Bluetooth ini.');
      }

      // Send bytes in chunks of 512 bytes to prevent BLE buffer overflow
      const CHUNK_SIZE = 512;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        if (writeChar.writeValueWithoutResponse) {
          await writeChar.writeValueWithoutResponse(chunk);
        } else {
          await writeChar.writeValue(chunk);
        }
      }

      const printerName = device.name || 'Printer Thermal';
      return { success: true, printerName };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'Pencarian printer dibatalkan' };
      }
      return { success: false, error: err.message || 'Gagal mencetak struk' };
    }
  },
};
