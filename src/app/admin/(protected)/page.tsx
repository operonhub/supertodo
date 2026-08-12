'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge, StatCard } from '@/components/admin/ui';
import { AlertIcon } from '@/components/icons';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useHydrated, useOrders, useProducts } from '@/hooks/useStores';
import { formatARS } from '@/lib/currency';
import { relativeTime } from '@/lib/dates';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_STYLE,
  PAYMENT_LABEL,
  summarizeToday,
} from '@/lib/orders';
import { hasPromotion, isActive } from '@/lib/products';
import { refreshOrders } from '@/lib/stores';

export default function ResumenPage() {
  const orders = useOrders();
  const products = useProducts();
  const hydrated = useHydrated();

  // Es la pantalla de entrada del panel: si muestra los números de hace dos
  // horas, el resto deja de ser creíble.
  useRefreshOnFocus(refreshOrders);

  const resumen = useMemo(() => summarizeToday(orders), [orders]);

  const catálogo = useMemo(
    () => ({
      activos: products.filter(isActive).length,
      enOferta: products.filter((p) => isActive(p) && hasPromotion(p)).length,
      sinStock: products.filter((p) => isActive(p) && !p.available).length,
    }),
    [products],
  );

  /** Los últimos cinco, sin importar el día: es lo que el dueño mira al llegar. */
  const recientes = useMemo(
    () => orders.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
    [orders],
  );

  // Sólo se muestran las alertas que existen: una lista de ceros es ruido.
  const alertas = [
    resumen.sinConfirmar > 0 && {
      tono: 'aviso' as const,
      texto: `${resumen.sinConfirmar} ${
        resumen.sinConfirmar === 1 ? 'pedido sin confirmar' : 'pedidos sin confirmar'
      } — confirmalos cuando te llegue el WhatsApp`,
    },
    resumen.listos > 0 && {
      tono: 'ok' as const,
      texto: `${resumen.listos} ${resumen.listos === 1 ? 'pedido listo' : 'pedidos listos'} para entregar`,
    },
    resumen.faltaPagar > 0 && {
      tono: 'alerta' as const,
      texto: `${resumen.faltaPagar} ${resumen.faltaPagar === 1 ? 'pedido' : 'pedidos'} sin pagar por ${formatARS(resumen.aCobrar)}`,
    },
    catálogo.sinStock > 0 && {
      tono: 'alerta' as const,
      texto: `${catálogo.sinStock} ${catálogo.sinStock === 1 ? 'producto' : 'productos'} sin stock en la tienda`,
    },
  ].filter(Boolean) as { tono: 'ok' | 'alerta' | 'aviso'; texto: string }[];

  // El rojo queda para lo que cuesta plata (sin pagar, sin stock). Un pedido
  // sin confirmar es una tarea pendiente, no un problema.
  const TONO: Record<'ok' | 'alerta' | 'aviso', string> = {
    ok: 'bg-verde-soft text-verde',
    alerta: 'bg-rojo/10 text-rojo',
    aviso: 'bg-amber-50 text-amber-900',
  };

  return (
    <>
      <PageHeader title="Resumen" showDate />

      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.map((a) => (
            <div
              key={a.texto}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold ${TONO[a.tono]}`}
            >
              <AlertIcon className="h-4 w-4 shrink-0" />
              {a.texto}
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Pedidos de hoy" value={resumen.pedidosHoy} />
        <StatCard
          label="Pendientes de preparar"
          value={resumen.pendientes}
          tone={resumen.pendientes > 0 ? 'alerta' : 'normal'}
          hint="Nuevos y en preparación"
        />
        <StatCard
          label="Vendido hoy"
          value={formatARS(resumen.vendidoHoy)}
          tone="ok"
          hint="Estimado, sin contar cancelados"
        />
        <StatCard
          label="Falta cobrar"
          value={resumen.faltaPagar}
          tone={resumen.faltaPagar > 0 ? 'alerta' : 'normal'}
          hint={resumen.aCobrar > 0 ? formatARS(resumen.aCobrar) : undefined}
        />
        <StatCard label="Productos activos" value={catálogo.activos} />
        <StatCard label="En oferta hoy" value={catálogo.enOferta} tone="ok" />
      </div>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">Pedidos recientes</h2>
        <Link href="/admin/pedidos" className="text-sm font-bold text-verde underline-offset-2 hover:underline">
          Ver todos
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {!hydrated ? (
          <p className="px-5 py-8 text-center text-sm text-verde/90">Cargando pedidos…</p>
        ) : recientes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-verde/90">Todavía no entró ningún pedido.</p>
        ) : (
          <ul className="divide-y divide-verde/5">
            {recientes.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:px-5">
                <span className="precio text-sm font-bold text-verde/90">#{order.id}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{order.customer.name}</span>
                <Badge className={ORDER_STATUS_STYLE[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
                <Badge className={PAYMENT_STYLE[order.payment]}>{PAYMENT_LABEL[order.payment]}</Badge>
                <span className="precio w-20 text-right text-sm font-extrabold">
                  {formatARS(order.total)}
                </span>
                <span className="w-20 text-right text-[11px] text-verde/90">
                  {relativeTime(order.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
