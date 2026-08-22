'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  ClipboardIcon,
  ExternalIcon,
  FolderIcon,
  LayoutIcon,
  LogOutIcon,
  PackageIcon,
  PartyIcon,
  SettingsIcon,
  TagIcon,
} from '@/components/icons';
import { Logo } from '@/components/Logo';
import { OperonBadge } from '@/components/OperonBadge';
import { useChatTails, useOrders, useSettings } from '@/hooks/useStores';
import { pendingChatOrderIds } from '@/lib/orderChatStore';
import { esperaAtención } from '@/lib/orders';
import { createClient } from '@/lib/supabase/client';

type Item = {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
};

const ITEMS: Item[] = [
  { href: '/admin', label: 'Resumen', Icon: LayoutIcon },
  { href: '/admin/productos', label: 'Productos', Icon: PackageIcon },
  { href: '/admin/categorias', label: 'Categorías', Icon: FolderIcon },
  { href: '/admin/ofertas', label: 'Ofertas', Icon: TagIcon },
  { href: '/admin/pedidos', label: 'Pedidos', Icon: ClipboardIcon },
  { href: '/admin/catering', label: 'Catering', Icon: PartyIcon },
  { href: '/admin/configuracion', label: 'Configuración', Icon: SettingsIcon },
];

/**
 * Navegación del panel.
 *
 * En escritorio es una barra lateral verde oscuro; abajo de `lg` se convierte en
 * una fila con scroll horizontal, para que en el celular no se coma la pantalla
 * pero siga estando todo a un toque.
 */
/**
 * Un solo número, un solo significado: pedidos que te esperan.
 *
 * Se suman dos motivos distintos —nadie lo atendió todavía, o el cliente
 * escribió y nadie le contestó— pero se cuentan por pedido, no por motivo:
 * dos badges compitiendo en el mismo ítem obligan a leer cuál es cuál, y en
 * el celular el sidebar es una fila angosta donde no entran.
 */
function usePedidosPendientes(): number {
  const orders = useOrders();
  const tails = useChatTails();

  return useMemo(() => {
    const pendientes = new Set(orders.filter(esperaAtención).map((o) => o.id));
    const conocidos = new Set(orders.map((o) => o.id));

    for (const id of pendingChatOrderIds(tails)) {
      // Un chat huérfano (pedido borrado) no puede inflar el contador con algo
      // que el dueño no va a poder abrir desde ningún lado.
      if (conocidos.has(id)) pendientes.add(id);
    }

    return pendientes.size;
  }, [orders, tails]);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const pendientes = usePedidosPendientes();

  async function cerrarSesión() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // `refresh()` para que el proxy vea la sesión ya cerrada en la próxima
    // navegación, no una respuesta cacheada de cuando todavía había sesión.
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <aside className="shrink-0 bg-verde-dark text-white lg:min-h-dvh lg:w-60">
      <div className="px-5 pb-2 pt-4 lg:pb-4 lg:pt-6">
        <Logo className="hidden h-14 w-auto lg:block" />
        <p className="text-[11px] font-medium text-white/75 lg:mt-2">
          <span className="lg:block">Panel del comercio</span>
          <span className="lg:hidden"> · </span>
          <span className="lg:block">{settings.address.neighborhood}</span>
        </p>
      </div>

      <nav aria-label="Secciones del panel" className="no-scrollbar flex gap-1 overflow-x-auto p-3 lg:flex-col">
        {ITEMS.map(({ href, label, Icon }) => {
          // `/admin` sólo coincide exacto; el resto también con sus subrutas.
          const activo = href === '/admin' ? pathname === href : pathname.startsWith(href);
          const badge = href === '/admin/pedidos' && pendientes > 0 ? pendientes : null;

          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                activo ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {badge !== null && (
                /* Dorado y no rojo: es trabajo esperando, no una falla. El rojo
                   del sistema está reservado para descuentos y errores. */
                <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-dorado px-1.5 text-[11px] font-extrabold text-verde-dark">
                  {badge}
                  <span className="sr-only"> pedidos esperando</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-3 pb-5 lg:block">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalIcon className="h-3.5 w-3.5" />
          Ver la tienda
        </Link>
        <button
          type="button"
          onClick={cerrarSesión}
          className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOutIcon className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>

        <OperonBadge className="mt-3 px-3.5 text-white/40 hover:text-white/70" />
      </div>
    </aside>
  );
}
