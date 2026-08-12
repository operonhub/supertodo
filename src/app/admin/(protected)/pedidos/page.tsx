'use client';

import { useCallback, useMemo, useState } from 'react';
import { OrderDetail } from '@/components/admin/OrderDetail';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge, Toast, inputClass, selectClass } from '@/components/admin/ui';
import { RefreshIcon, SearchIcon } from '@/components/icons';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useHydrated, useOrders, useOrdersUpdatedAt } from '@/hooks/useStores';
import { formatARS } from '@/lib/currency';
import { formatDateTime, formatTime, relativeTime } from '@/lib/dates';
import {
  DEFAULT_FILTERS,
  DELIVERY_LABEL,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_LABEL,
  PAYMENT_STYLE,
  SORT_LABEL,
  filterOrders,
  type OrderFilters,
  type OrderSort,
} from '@/lib/orders';
import { refreshOrders, removeOrder, setOrderPayment, setOrderStatus } from '@/lib/stores';
import type { Order } from '@/types';

const RANGOS: { value: OrderFilters['range']; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Últimos 7 días' },
  { value: 'todos', label: 'Todos' },
];

export default function PedidosPage() {
  const orders = useOrders();
  const hydrated = useHydrated();

  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const actualizadoEn = useOrdersUpdatedAt();

  async function actualizar() {
    setActualizando(true);
    try {
      await refreshOrders();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudieron actualizar los pedidos.');
    } finally {
      setActualizando(false);
    }
  }

  // Al volver de WhatsApp al panel, la lista se pone al día sola: es
  // exactamente el momento en que el dueño viene a buscar el pedido nuevo.
  useRefreshOnFocus(refreshOrders);

  /**
   * `setOrderStatus`/`setOrderPayment` van a Supabase y pueden fallar: si tira,
   * el store no cambia (se queda con el valor anterior) y se avisa con un
   * toast, en vez de asumir en silencio que el cambio se guardó.
   */
  const cambiarEstado = useCallback(async (id: string, status: Order['status']) => {
    try {
      await setOrderStatus(id, status);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    }
  }, []);

  const cambiarPago = useCallback(async (id: string, payment: Order['payment']) => {
    try {
      await setOrderPayment(id, payment);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo actualizar el pago.');
    }
  }, []);

  const visibles = useMemo(() => filterOrders(orders, filters), [orders, filters]);

  // Se busca por id en la lista completa y no en `visibles`: si el dueño cambia
  // el estado de un pedido y eso lo saca del filtro, el panel abierto no se
  // tiene que cerrar de golpe.
  const detalle = useMemo(
    () => orders.find((o) => o.id === detalleId) ?? null,
    [orders, detalleId],
  );

  const set = <K extends keyof OrderFilters>(campo: K, valor: OrderFilters[K]) =>
    setFilters((f) => ({ ...f, [campo]: valor }));

  const cerrarDetalle = useCallback(() => setDetalleId(null), []);

  // El error se deja subir para que `DeleteButton` lo muestre donde se apretó,
  // en vez de cerrar el detalle como si hubiera funcionado.
  const eliminar = useCallback(async (id: string) => {
    await removeOrder(id);
    setDetalleId(null);
    setAviso('Pedido eliminado');
  }, []);

  const totalVisible = visibles.reduce((sum, o) => sum + o.total, 0);

  return (
    <>
      <PageHeader
        title="Pedidos"
        showDate={filters.range === 'hoy'}
        subtitle={
          hydrated
            ? `${visibles.length} ${visibles.length === 1 ? 'pedido' : 'pedidos'} · ${formatARS(totalVisible)}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-3">
            {/* Hora exacta y no "hace 5 minutos": un relativo se congela hasta
                el próximo render y terminaría mintiendo justo cuando importa
                saber qué tan vieja es la lista. */}
            {actualizadoEn && (
              <span className="text-[11px] text-verde/90">
                Actualizado {formatTime(new Date(actualizadoEn))}
              </span>
            )}
            <button
              type="button"
              onClick={actualizar}
              disabled={actualizando}
              className="flex items-center gap-2 rounded-xl border border-verde/20 bg-white px-4 py-2.5 text-sm font-bold text-verde shadow-card transition-colors hover:bg-verde/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} />
              {actualizando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        }
      />

      {/* ---------- Filtros ---------- */}
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={filters.range === r.value}
            onClick={() => set('range', r.value)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              filters.range === r.value
                ? 'bg-verde text-white'
                : 'border border-verde/15 bg-white text-verde hover:border-verde/40'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-verde/70" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Cliente, teléfono o #pedido"
            aria-label="Buscar por cliente, teléfono o número de pedido"
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => set('status', e.target.value as OrderFilters['status'])}
          aria-label="Filtrar por estado del pedido"
          className={selectClass}
        >
          <option value="todos">Todos los estados</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={filters.payment}
          onChange={(e) => set('payment', e.target.value as OrderFilters['payment'])}
          aria-label="Filtrar por estado de pago"
          className={selectClass}
        >
          <option value="todos">Pagos: todos</option>
          <option value="falta_pagar">Falta pagar</option>
          <option value="pagado">Pagado</option>
        </select>

        <select
          value={filters.delivery}
          onChange={(e) => set('delivery', e.target.value as OrderFilters['delivery'])}
          aria-label="Filtrar por modalidad de entrega"
          className={selectClass}
        >
          <option value="todos">Entrega: todas</option>
          <option value="retiro">Retiro por local</option>
          <option value="reparto">Reparto</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => set('sort', e.target.value as OrderSort)}
          aria-label="Ordenar pedidos"
          className={selectClass}
        >
          {(Object.keys(SORT_LABEL) as OrderSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* ---------- Lista ---------- */}
      {!hydrated ? (
        <p className="rounded-2xl bg-white px-5 py-12 text-center text-sm text-verde/90 shadow-card">
          Cargando pedidos…
        </p>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-card">
          <p className="font-bold">No hay pedidos con esos filtros</p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-3 rounded-xl bg-verde px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-verde-dark"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          {/* Tabla en escritorio */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-verde/10 text-left text-xs text-verde/90">
                    <th scope="col" className="px-5 py-3.5 font-semibold">Pedido</th>
                    <th scope="col" className="px-3 py-3.5 font-semibold">Cliente</th>
                    <th scope="col" className="px-3 py-3.5 font-semibold">Entrega</th>
                    <th scope="col" className="px-3 py-3.5 text-right font-semibold">Total</th>
                    <th scope="col" className="px-3 py-3.5 font-semibold">Estado</th>
                    <th scope="col" className="px-3 py-3.5 font-semibold">Pago</th>
                    <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((order) => (
                    <tr key={order.id} className="border-b border-verde/5 transition-colors last:border-0 hover:bg-crema/60">
                      <td className="px-5 py-3">
                        <p className="precio font-extrabold">#{order.id}</p>
                        <p className="precio text-[11px] text-verde/90">{formatDateTime(order.createdAt)}</p>
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-semibold">{order.customer.name}</p>
                        <p className="precio text-[11px] text-verde/90">{order.customer.phone}</p>
                      </td>

                      <td className="px-3 py-3 text-verde/90">{DELIVERY_LABEL[order.delivery]}</td>

                      <td className="precio px-3 py-3 text-right font-extrabold">
                        {formatARS(order.total)}
                      </td>

                      <td className="px-3 py-3">
                        <select
                          value={order.status}
                          aria-label={`Estado del pedido ${order.id}`}
                          onChange={(e) => cambiarEstado(order.id, e.target.value as Order['status'])}
                          className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] font-bold ${ORDER_STATUS_STYLE[order.status]}`}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            cambiarPago(order.id, order.payment === 'pagado' ? 'falta_pagar' : 'pagado')
                          }
                          aria-label={`Marcar el pedido ${order.id} como ${
                            order.payment === 'pagado' ? 'falta pagar' : 'pagado'
                          }`}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition hover:brightness-95 ${PAYMENT_STYLE[order.payment]}`}
                        >
                          {PAYMENT_LABEL[order.payment]}
                        </button>
                      </td>

                      <td className="px-5 py-3 text-right">
                        {order.status === 'sin_confirmar' && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(order.id, 'nuevo')}
                            className="mr-1 rounded-lg bg-verde px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-verde-dark"
                          >
                            Confirmar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetalleId(order.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-verde transition-colors hover:bg-verde/10"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tarjetas en mobile */}
          <ul className="space-y-3 lg:hidden">
            {visibles.map((order) => (
              <li key={order.id} className="rounded-2xl bg-white p-4 shadow-card">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{order.customer.name}</p>
                    <p className="precio text-[11px] text-verde/90">
                      #{order.id} · {relativeTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="precio shrink-0 text-lg font-extrabold">{formatARS(order.total)}</span>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  <Badge className={ORDER_STATUS_STYLE[order.status]}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </Badge>
                  <Badge className={PAYMENT_STYLE[order.payment]}>{PAYMENT_LABEL[order.payment]}</Badge>
                  <Badge className="bg-verde/10 text-verde">{DELIVERY_LABEL[order.delivery]}</Badge>
                </div>

                {/* En un pedido sin confirmar la acción es una sola, así que va
                    a lo ancho y arriba de todo: cambiarle el estado o marcarlo
                    pagado no tiene sentido hasta saber que el pedido existe. */}
                {order.status === 'sin_confirmar' && (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(order.id, 'nuevo')}
                    className="mb-2 w-full rounded-xl bg-verde px-3 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-verde-dark"
                  >
                    Confirmar pedido
                  </button>
                )}

                <div className="flex flex-wrap gap-2">
                  <select
                    value={order.status}
                    aria-label={`Estado del pedido ${order.id}`}
                    onChange={(e) => cambiarEstado(order.id, e.target.value as Order['status'])}
                    className={`${selectClass} w-auto flex-1 text-xs`}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      cambiarPago(order.id, order.payment === 'pagado' ? 'falta_pagar' : 'pagado')
                    }
                    className="rounded-xl border border-verde/20 px-3 py-2 text-xs font-bold text-verde transition-colors hover:bg-verde/5"
                  >
                    {order.payment === 'pagado' ? 'Marcar sin pagar' : 'Marcar pagado'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetalleId(order.id)}
                    className="rounded-xl bg-verde px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-verde-dark"
                  >
                    Ver detalle
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <OrderDetail
        order={detalle}
        onClose={cerrarDetalle}
        onStatusChange={cambiarEstado}
        onPaymentChange={cambiarPago}
        onDelete={eliminar}
      />

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}
