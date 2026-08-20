import { BUSINESS } from '@/config/business';
import { formatARS } from '@/lib/currency';
import { formatDateTime } from '@/lib/dates';
import type { DeliveryMode, Order, TeamMember } from '@/types';

const ESTADO_PAGO: Record<Order['payment'], string> = {
  falta_pagar: 'Falta pagar',
  pagado: 'Pagado',
};

const MODALIDAD: Record<DeliveryMode, string> = {
  retiro: 'Retiro por local',
  reparto: 'Reparto',
};

/**
 * Link de WhatsApp para consultas generales del local.
 *
 * Usamos wa.me porque funciona igual en la app del celular y en WhatsApp Web,
 * pero el checkout ya no depende de este canal.
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
