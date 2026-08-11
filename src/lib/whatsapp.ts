import { BUSINESS, FULL_ADDRESS } from '@/config/business';
import { formatARS } from '@/lib/currency';
import type { CartSummary } from '@/types';

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
