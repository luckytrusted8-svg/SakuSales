# Panduan Pengaturan dan Deployment SakuSales

Tagline: Jualan & Pencatatan Cepat

Dokumen ini memuat langkah demi langkah untuk menjalankan dan menghubungkan seluruh komponen SakuSales:
1. Skema Database Supabase & RPC create_order
2. Akun Penjual Supabase Auth
3. Edge Function notify-order & OneSignal Webhook
4. Halaman Pembeli Web Statis
5. Aplikasi Android Penjual (Flutter)

---

## 1. Menjalankan Skema Database Supabase

1. Buka Dashboard Supabase pada proyek Anda: https://supabase.com/dashboard
2. Pilih menu **SQL Editor** di panel kiri, lalu klik **New Query**.
3. Buka file `supabase/schema.sql` di proyek ini, salin seluruh kodenya, lalu tempel di SQL Editor.
4. Klik tombol **Run**.
5. Pastikan seluruh tabel dan fungsi berhasil dibuat tanpa error:
   - Tabel: `products`, `sizes`, `glazes`, `toppings`, `ingredients`, `recipes`, `po_sessions`, `orders`, `order_items`.
   - Enum: `payment_method`, `order_status`.
   - Fungsi RPC: `create_order(p_slug, p_buyer, p_items)`.
   - Realtime Publication: tabel `orders` sudah ditambahkan ke `supabase_realtime`.

---

## 2. Membuat Akun Penjual di Supabase Auth

1. Di Dashboard Supabase, pilih menu **Authentication** lalu tab **Users**.
2. Klik tombol **Add User** -> **Create User**.
3. Masukkan Email dan Kata Sandi penjual:
   - Email: `penjual@sakusales.id` (atau email penjual Anda)
   - Kata Sandi: Buat kata sandi yang aman.
   - Centang **Auto Confirm User?** agar user langsung aktif tanpa perlu verifikasi email.
4. Klik **Create User**.

---

## 3. Konfigurasi OneSignal dan Edge Function

### 3.1 Dapatkan Kunci OneSignal
1. Buat aplikasi di https://onesignal.com dengan target Android.
2. Salin **OneSignal App ID** dan **REST API Key** dari Settings -> Keys & IDs.

### 3.2 Pasang Secrets di Supabase
Jalankan di terminal proyek SakuSales:
```bash
npx.cmd supabase secrets set ONESIGNAL_APP_ID="app-id-anda" ONESIGNAL_REST_API_KEY="rest-api-key-anda" WEBHOOK_SECRET="secret-acak-anda" ONESIGNAL_ANDROID_CHANNEL_ID="pesanan_baru"
```

### 3.3 Deploy Edge Function notify-order
```bash
npx.cmd supabase functions deploy notify-order --no-verify-jwt
```

### 3.4 Buat Database Webhook di Supabase
1. Di Dashboard Supabase, pilih menu **Database** -> **Webhooks**.
2. Klik **Create a new webhook**:
   - Name: `notify-order-webhook`
   - Table: `orders`
   - Events: Centang **Insert** saja
   - Type: **Supabase Edge Functions**
   - Function: Pilih `notify-order`
   - HTTP Headers: Tambahkan header `x-webhook-secret` dengan nilai rahasia yang sama dengan `WEBHOOK_SECRET` di atas.
3. Klik **Save Webhook**.

---

## 4. Konfigurasi dan Menjalankan Web Pembeli

1. Buka file `web/config.js`.
2. Masukkan URL dan Anon Key Supabase Anda:
   ```javascript
   window.SAKUSALES_CONFIG = {
     SUPABASE_URL: "https://proyek-anda.supabase.co",
     SUPABASE_ANON_KEY: "anon-key-anda",
     SELLER_WA: "62895629244156"
   };
   ```
3. Uji lokal dengan server statis apa pun:
   ```bash
   npx.cmd serve web
   ```
4. Buka di browser HP atau desktop: `http://localhost:3000/?slug=po_batch_1` (sesuai slug sesi PO yang Anda buat).
5. Untuk deployment publik:
   Folder `web/` dapat langsung di-drag-and-drop atau di-push ke Vercel, Netlify, Cloudflare Pages, atau GitHub Pages secara gratis tanpa backend build.

---

## 5. Cara Pasang APK Android di HP Penjual

1. Setelah build selesai, file APK berada di:
   `build/app/outputs/flutter-apk/app-release.apk`
2. Pindahkan file `app-release.apk` ke HP Android (bisa lewat kabel USB, WhatsApp Web, Google Drive, atau download langsung).
3. Buka file `app-release.apk` di HP Android penjual:
   - Jika muncul peringatan keamanan "Install unknown apps" / "Izinkan instalasi dari sumber ini", aktifkan izin tersebut.
   - Klik **Install** / **Pasang**.
4. Buka aplikasi SakuSales:
   - Izinkan notifikasi saat diminta.
   - Masuk dengan email dan kata sandi penjual.
   - Channel notifikasi `pesanan_baru` dengan suara dering `correct_answer.wav` akan otomatis aktif.
