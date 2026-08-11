import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

/**
 * ⚠️ TODO — ANTES DE PRODUCCIÓN: proteger esta ruta con login.
 *
 * Hoy `/admin` es accesible para cualquiera que conozca la URL. El proyecto
 * todavía no tiene autenticación, así que queda abierta para poder trabajar y
 * mostrarle el flujo al dueño.
 *
 * Cuando se conecte la base de datos (Supabase), acá va la verificación de
 * sesión: leer el usuario en este layout —que envuelve a todas las pantallas del
 * panel— y redirigir a login si no hay sesión o si no tiene rol de dueño. Es el
 * único punto que hay que tocar: ninguna pantalla hija chequea permisos por su
 * cuenta.
 */

export const metadata: Metadata = {
  title: 'Panel — Super Todo',
  // El panel no tiene por qué aparecer en Google.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
