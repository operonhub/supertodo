import { isToday, isWithinDays } from '@/lib/dates';
import { normalizeText } from '@/lib/text';
import type { DeliveryMode, Order, OrderStatus, PaymentStatus } from '@/types';

/** Etiquetas visibles. Se definen una vez para que no se escriban distinto en cada pantalla. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  sin_confirmar: 'Sin confirmar',
  nuevo: 'Nuevo',
  preparando: 'Preparando',
  listo: 'Listo para retirar',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  falta_pagar: 'Falta pagar',
  pagado: 'Pagado',
};

export const DELIVERY_LABEL: Record<DeliveryMode, string> = {
  retiro: 'Retiro por local',
  reparto: 'Reparto',
};

/** Orden en que se ofrecen los estados en los selectores. */
export const ORDER_STATUSES: OrderStatus[] = [
  'sin_confirmar',
  'nuevo',
  'preparando',
  'listo',
  'en_reparto',
  'entregado',
  'cancelado',
];

/**
 * Clases de color por estado.
 *
 * El rojo queda reservado para "falta pagar" y "cancelado": si todo grita, nada
 * grita, y lo que el dueño necesita ver de un vistazo es qué le falta cobrar.
 */
export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  // Fantasma a propósito: sin relleno y sólo con contorno, para que se lea
  // "todavía no es un pedido de verdad" sin robarle atención a los que sí
  // hay que preparar. Va con `ring` y no con `border` porque el selector de
  // estado de la lista de pedidos fuerza `border-0`.
  sin_confirmar: 'bg-white text-verde/80 ring-1 ring-verde/25',
  nuevo: 'bg-sky-100 text-sky-800',
  preparando: 'bg-amber-100 text-amber-800',
  listo: 'bg-verde-soft text-verde',
  en_reparto: 'bg-violet-100 text-violet-800',
  entregado: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-rojo/10 text-rojo',
};

export const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  falta_pagar: 'bg-rojo/10 text-rojo',
  pagado: 'bg-verde-soft text-verde',
};

export type DateRange = 'hoy' | 'semana' | 'todos';
export type OrderSort = 'recientes' | 'antiguos' | 'total' | 'cliente';

export const SORT_LABEL: Record<OrderSort, string> = {
  recientes: 'Más recientes',
  antiguos: 'Más antiguos',
  total: 'Mayor total',
  cliente: 'Cliente A-Z',
};

export interface OrderFilters {
  range: DateRange;
  query: string;
  status: OrderStatus | 'todos';
  payment: PaymentStatus | 'todos';
  delivery: DeliveryMode | 'todos';
  sort: OrderSort;
}

export const DEFAULT_FILTERS: OrderFilters = {
  range: 'hoy',
  query: '',
  status: 'todos',
  payment: 'todos',
  delivery: 'todos',
  sort: 'recientes',
};

/** Sólo dígitos, para poder buscar "1155123344" y encontrar "+54 11 5512-3344". */
const onlyDigits = (text: string) => text.replace(/\D/g, '');

function matchesQuery(order: Order, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const dígitos = onlyDigits(q);
  if (dígitos.length >= 3 && onlyDigits(order.customer.phone).includes(dígitos)) return true;

  const heno = normalizeText(`${order.customer.name} ${order.id}`);
  return heno.includes(normalizeText(q));
}

export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const filtrados = orders.filter((order) => {
    if (filters.range === 'hoy' && !isToday(order.createdAt)) return false;
    if (filters.range === 'semana' && !isWithinDays(order.createdAt, 7)) return false;
    if (filters.status !== 'todos' && order.status !== filters.status) return false;
    if (filters.payment !== 'todos' && order.payment !== filters.payment) return false;
    if (filters.delivery !== 'todos' && order.delivery !== filters.delivery) return false;
    return matchesQuery(order, filters.query);
  });

  // `toSorted` no está disponible en todos los runtimes objetivo, así que se
  // copia antes de ordenar para no mutar el array del store.
  return filtrados.slice().sort((a, b) => {
    switch (filters.sort) {
      case 'antiguos':
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      case 'total':
        return b.total - a.total;
      case 'cliente':
        return a.customer.name.localeCompare(b.customer.name, 'es-AR');
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });
}

/**
 * Un pedido sin confirmar no es una venta: se grabó cuando el cliente apretó
 * "enviar", pero nadie sabe si después mandó el WhatsApp. Contarlo como venta
 * inflaría la caja del día con carritos abandonados.
 */
export const estáConfirmado = (order: Order) => order.status !== 'sin_confirmar';

/** Números del día para el Resumen. */
export function summarizeToday(orders: Order[]) {
  const deHoy = orders.filter((o) => isToday(o.createdAt));
  const confirmados = deHoy.filter(estáConfirmado);
  const vigentes = confirmados.filter((o) => o.status !== 'cancelado');

  return {
    pedidosHoy: confirmados.length,
    sinConfirmar: deHoy.length - confirmados.length,
    // "Pendientes de preparación" es lo que todavía no salió del mostrador.
    pendientes: vigentes.filter((o) => o.status === 'nuevo' || o.status === 'preparando').length,
    listos: vigentes.filter((o) => o.status === 'listo').length,
    enReparto: vigentes.filter((o) => o.status === 'en_reparto').length,
    faltaPagar: vigentes.filter((o) => o.payment === 'falta_pagar').length,
    // El total estimado no cuenta cancelados: no se vendió.
    vendidoHoy: vigentes.reduce((sum, o) => sum + o.total, 0),
    aCobrar: vigentes
      .filter((o) => o.payment === 'falta_pagar')
      .reduce((sum, o) => sum + o.total, 0),
  };
}
