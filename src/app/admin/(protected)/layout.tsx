import type { Metadata } from 'next';
import { AdminAlerts } from '@/components/admin/AdminAlerts';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

/**
 * Todo lo que cuelga de este grupo de rutas está protegido: `src/proxy.ts`
 * redirige a `/admin/login` antes de que esto llegue a renderizar si no hay
 * sesión. `/admin/login` queda deliberadamente FUERA de este grupo —así no
 * hereda el sidebar, que no tiene sentido mostrar antes de loguearse— y es
 * la única pantalla de `/admin/*` que el proxy deja pasar sin sesión.
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
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        {/* Fuera de `children` para que el canal en vivo no se desmonte al
            navegar entre secciones del panel. */}
        <AdminAlerts />
        {children}
      </main>
    </div>
  );
}
