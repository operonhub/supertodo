import { BUSINESS, FULL_ADDRESS } from '@/config/business';
import { formatARS } from '@/lib/currency';
import { formatDateTime } from '@/lib/dates';
import type { CartSummary, Order, TeamMember } from '@/types';

/**
 * Redacta el pedido tal como le llega al almacén.
 *
 * El mensaje se arma una sola vez acá: la vista previa que ve el cliente y el
 * texto que viaja a WhatsApp salen de esta misma función, así no pueden
 * diferir.
 */
export function buildOrderMessage(summary: CartSummary): string {
  const lineas = summary.lines.map(
    (l) => `• ${l.quantity}x ${l.product.name} (${l.product.unit}) — ${formatARS(l.subtotal)}`,
  );

  return [
    'Hola, quiero hacer este pedido:',
    '',
    ...lineas,
    '',
    `Total: ${formatARS(summary.total)}`,
    '',
    `${BUSINESS.pickup.title} — ${FULL_ADDRESS}`,
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

const ESTADO_PAGO: Record<Order['payment'], string> = {
  falta_pagar: 'Falta pagar',
  pagado: 'Pagado',
};

const MODALIDAD: Record<Order['delivery'], string> = {
  retiro: 'Retiro por local',
  reparto: 'Reparto',
};

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
    `Pago: ${ESTADO_PAGO[order.payment]}`,
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
