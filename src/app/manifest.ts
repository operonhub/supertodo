import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/config/business';

/**
 * Next sirve esto en `/manifest.webmanifest`. Es lo que Chrome/Android lee
 * para decidir si la página es "instalable" y con qué ícono, nombre y color
 * abrirla en modo standalone (sin la barra de direcciones).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS.name} — Pedidos por WhatsApp`,
    short_name: BUSINESS.name,
    start_url: '/',
    display: 'standalone',
    background_color: '#faf6ed',
    theme_color: '#1B5E3B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
