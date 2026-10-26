# SakuSales 🛒📱

> **Aplikasi Kasir (POS) & Pembukuan UMKM Jajanan — 100% Offline-First PWA**  
> Didesain dengan kecepatan tinggi (3–4 tap selesai transaksi), navigasi mobile ergonomis, cetak thermal ESC/POS Bluetooth, dan zero-seed database.

---

## ✨ Fitur Utama

- ⚡ **Kasir Kilat & Ergonomis**:
  - Tombol aksi tap target besar (min 48px) ramah layar sentuh HP & tablet.
  - Pilihan addon/topping dinamis dengan popup instan.
  - Rekomendasi pecahan uang tunai cerdas (10k, 20k, 50k, 100k, dan Uang Pas) + kalkulasi kembalian otomatis.
  - Pembayaran Tunai, QRIS, Transfer Bank, dan Hutang/Piutang.

- 🖨️ **Struk & Cetak Multi-Channel**:
  - Cetak thermal langsung via **Web Bluetooth (ESC/POS 58mm / 80mm)**.
  - Fallback ke **Browser Print (`window.print()`)** dengan styling khusus kertas struk thermal.
  - Kirim struk instan ke **WhatsApp Pelanggan** dengan format teks rapi.

- 📦 **Katalog Produk & Snapshot Pricing**:
  - **Zero Hardcoded Data**: Semua data master dibuat dan dikelola langsung oleh pengguna lewat CRUD.
  - **Snapshot Pattern**: Harga produk, addon, dan HPP dikunci saat transaksi dibuat agar laporan keuangan masa lalu tetap akurat meskipun harga diubah di kemudian hari.

- 🍳 **Kalkulasi Resep & HPP Otomatis**:
  - Kelola bahan baku mentah dengan konversi satuan (gr, ml, pcs, kg, ltr).
  - Susun resep per varian/produk untuk menghitung estimasi HPP riil dan margin laba kotor.

- 📊 **Laporan & Export Data**:
  - Ringkasan KPI (Omset kotor, Net Penjualan, Laba Kotor, Pengeluaran, Laba Bersih).
  - Grafik tren penjualan per jam (Recharts).
  - Export pembukuan ke **Excel Multi-Sheet (.xlsx)** via SheetJS.
  - Export laporan ke **PDF Formal (.pdf)** via jsPDF.

- 🔒 **Keamanan & Multi-Role**:
  - Role Owner & Kasir dengan verifikasi PIN 6-digit.
  - Hashing keamanan standar industri via **PBKDF2 Web Crypto API**.
  - Fitur Auto-Lock otomatis setelah periode idle dengan overlay buka kunci cepat.

- 💾 **100% Offline-First**:
  - Basis data lokal browser menggunakan **IndexedDB via Dexie.js**.
  - PWA Service Worker via **Serwist** — tetap bisa dibuka tanpa sinyal internet.
  - Backup & Restore data 1-klik via file JSON terenkripsi.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + Custom Hallmark Design Tokens
- **Font**: Montserrat (Google Fonts)
- **Database Lokal**: Dexie.js (IndexedDB)
- **State Management**: Zustand
- **Service Worker / PWA**: Serwist
- **Validasi**: Zod
- **Testing**: Vitest (100% passing pure domain unit tests)
- **Exporting**: SheetJS (xlsx) & jsPDF

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
- Node.js versi 18 ke atas (disarankan Node.js v20 atau v22 LTS).
- NPM atau package manager pilihan Anda.

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Buka browser dan akses:  
👉 **[http://localhost:3000](http://localhost:3000)**

> *Catatan: Server menggunakan konfigurasi bundler webpack yang stabil dan kompatibel untuk lingkungan Windows dan mobile emulation.*

### 4. Menjalankan Pengujian Unit (Unit Test)
Untuk memastikan seluruh rumus perhitungan harga, kembalian, format no. faktur harian, dan HPP berjalan akurat:
```bash
npm test
```

### 5. Membangun Bundle Produksi (Build & Run)
```bash
npm run build
npm start
```

---

## 📁 Struktur Direktori

```
src/
├── app/                  # Next.js App Router (Routes & Pages)
│   ├── (app)/            # Halaman utama aplikasi (kasir, transaksi, katalog, laporan, dll.)
│   ├── (auth)/           # Setup toko pertama kali & login PIN
│   ├── globals.css       # Hallmark Design Tokens & CSS Variables
│   └── manifest.ts       # Konfigurasi PWA Manifest
├── components/           # Reusable UI components
│   ├── kasir/            # Modal varian addon, kalkulator bayar, modal sukses
│   └── shared/           # Bottom navigation bar, sidebar, PIN keypad, lock overlay
├── lib/
│   ├── db/               # Dexie.js IndexedDB schema & repositories
│   ├── domain/           # Pure business logic (pricing, change, invoice, hpp)
│   ├── export/           # Export generator (Excel & PDF)
│   └── printing/         # ESC/POS byte generator, Bluetooth, WhatsApp formatter
├── stores/               # Zustand state stores (auth, cart)
└── tests/                # Vitest unit test suites
```

---

## 📄 Lisensi
MIT License © 2026 SakuSales.
