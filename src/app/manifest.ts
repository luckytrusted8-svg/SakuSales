import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SakuSales - Jualan & Pencatatan Cepat',
    short_name: 'SakuSales',
    description: 'Aplikasi Kasir POS & Pencatatan Keuangan UMKM Indonesia (Offline-First)',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F8FB',
    theme_color: '#0F2747',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
