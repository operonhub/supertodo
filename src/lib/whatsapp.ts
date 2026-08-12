import { BUSINESS, FULL_ADDRESS } from '@/config/business';
import { formatARS } from '@/lib/currency';
import { formatDateTime } from '@/lib/dates';
import type { DeliveryMode, Order, OrderItem, TeamMember } from '@/types';

const ESTADO_PAGO: Record<Order['payment'], string> = {
  falta_pagar: 'Falta pagar',
  pagado: 'Pagado',
};

const MODALIDAD: Record<DeliveryMode, string> = {
  retiro: 'Retiro por local',
  reparto: 'Reparto',
};

/**
 * Lo mínimo que necesita el mensaje del cliente. Deliberadamente más chico
 * que `Order`: en el checkout todavía no hay `id` ni `createdAt` (el pedido
 * no se guardó todavía), pero la vista previa ya tiene que mostrar el texto
 * final — así la misma función sirve para la previsualización y para el
 * mensaje real, sin inventar datos que todavía no existen.
 */
export interface OrderMessageInput {
  /**
   * Código del pedido. Falta en la vista previa (todavía no se grabó) y está
   * en el mensaje que se manda de verdad: es lo que le permite al dueño
   * cruzar el WhatsApp que le llega con la fila del panel para confirmarlo.
   */
  id?: string;
  customer: { name: string; address?: string };
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  delivery: DeliveryMode;
}

/**
 * Redacta el pedido tal como le llega al almacén.
 *
 * El mensaje se arma una sola vez acá: la vista previa que ve el cliente y el
 * texto que viaja a WhatsApp salen de esta misma función, así no pueden
 * diferir.
 */
export function buildOrderMessage(order: OrderMessageInput): string {
  const lineas = order.items.map((i) => {
    // La promo se nombra en la línea: con un 3x2 el subtotal no es cantidad ×
    // precio, y sin la aclaración el almacén lo lee como un error de cuenta.
    const promo = i.promotionLabel ? ` [${i.promotionLabel}]` : '';
    return `• ${i.quantity}x ${i.name} (${i.unit})${promo} — ${formatARS(i.subtotal)}`;
  });

  const entrega =
    order.delivery === 'reparto'
      ? `Envío a domicilio — ${order.customer.address}`
      : `${BUSINESS.pickup.title} — ${FULL_ADDRESS}`;

  return [
    `Hola, soy ${order.customer.name} y quiero hacer este pedido:`,
    '',
    ...lineas,
    '',
    `Total: ${formatARS(order.total)}`,
    `Pago: ${order.paymentMethod}`,
    entrega,
    ...(order.id ? ['', `Pedido #${order.id}`] : []),
  ].join('\n');
}

/**
 * Link de WhatsApp con el pedido ya redactado.
 *
 * Usamos wa.me porque funciona igual en la app del celular y en WhatsApp Web,
 * que es justo lo que necesita un cliente que entra desde un link.
 */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Orden de preparación para quien arma el pedido en el depósito.
 *
 * Es distinto del mensaje que manda el cliente: acá importa qué hay que juntar,
 * si va a mostrador o a reparto, y si hay que cobrar. Por eso el estado de pago
 * va arriba y bien visible.
 */
export function buildPrepMessage(order: Order): string {
  const líneas = order.items.map((i) => `• ${i.quantity}x ${i.name} (${i.unit})`);

  return [
    `Pedido #${order.id}`,
    `Cliente: ${order.customer.name}`,
    `Modalidad: ${MODALIDAD[order.delivery]}`,
    ...(order.delivery === 'reparto' && order.customer.address ? [`Dirección: ${order.customer.address}`] : []),
    `Pago: ${ESTADO_PAGO[order.payment]} (${order.paymentMethod})`,
    `Ingresó: ${formatDateTime(order.createdAt)}`,
    '',
    'Preparar:',
    ...líneas,
    '',
    `Total: ${formatARS(order.total)}`,
    ...(order.notes ? ['', `Nota: ${order.notes}`] : []),
  ].join('\n');
}

/**
 * Link para mandarle la preparación a alguien del equipo.
 *
 * Devuelve `null` si esa persona todavía no tiene teléfono cargado: es preferible
 * mostrar el botón deshabilitado antes que generar un `wa.me` roto que abre
 * WhatsApp en la nada.
 */
export function buildTeamWhatsAppUrl(member: TeamMember, message: string): string | null {
  const dígitos = member.phone.replace(/\D/g, '');
  if (!dígitos) return null;
  return `https://wa.me/${dígitos}?text=${encodeURIComponent(message)}`;
}
