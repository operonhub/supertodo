import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { BUSINESS, FULL_ADDRESS } from '@/config/business';
import './globals.css';

/**
 * Una sola familia tipográfica para todo el sitio, jugando con pesos.
 * Bricolage es variable, así que el peso no cuesta descargas extra.
 */
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${BUSINESS.name} — Pedidos online`,
  description: `Mirá las ofertas de ${BUSINESS.name}, armá tu pedido y lo retirás por ${FULL_ADDRESS}.`,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  // `apple-icon.png` en `src/app/` ya se detecta solo y agrega su propio
  // `<link rel="apple-touch-icon">`; acá sólo falta avisarle a iOS que la
  // página se puede abrir standalone (sin la barra de Safari).
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BUSINESS.name,
  },
};

export const viewport: Viewport = {
  themeColor: '#1B5E3B',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={`${bricolage.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
