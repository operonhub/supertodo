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
  title: `${BUSINESS.name} — Pedidos por WhatsApp`,
  description: `Mirá las ofertas de ${BUSINESS.name}, armá tu pedido y lo retirás por ${FULL_ADDRESS}.`,
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
