import { addOrderToSnapshot } from '@/lib/stores';
import { describePromotion } from '@/lib/products';
import { orderToRow } from '@/lib/supabase/mappers';
import { createClient } from '@/lib/supabase/client';
import type { CartSummary, DeliveryMode, Order, OrderItem } from '@/types';

export interface CheckoutInfo {
  name: string;
  phone: string;
  /** Nombre del método ya resuelto (`settings.paymentMethods`), no un id. */
  paymentMethod: string;
  delivery: DeliveryMode;
  /** Sólo se usa (y se exige) cuando `delivery === 'reparto'`. */
  address?: string;
}

/**
 * Id corto y legible, generado en el navegador: con la política de Supabase
 * que sólo deja insertar pedidos (sin permiso de `select`), un
 * `.insert().select()` no devolvería la fila creada. Generándolo antes no
 * hace falta releerla — el `Order` que arma esta función ya es la fuente de
 * verdad para el mensaje de WhatsApp.
 */
function generarId(): string {
  const marca = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 6);
  return `${marca}${azar}`.toUpperCase();
}

/** Reutilizado también por `CartSheet` para la vista previa del mensaje, antes de crear el pedido. */
export function buildOrderItems(summary: CartSummary): OrderItem[] {
  return summary.lines.map((line) => ({
    productId: line.product.id,
    name: line.product.name,
    unit: line.product.unit,
    quantity: line.quantity,
    unitPrice: line.product.price,
    subtotal: line.subtotal,
    promotionLabel: line.product.promotion ? describePromotion(line.product.promotion) : undefined,
  }));
}

/** Arma el pedido, lo inserta en Supabase y lo suma al store del panel. */
export async function createOrder(summary: CartSummary, info: CheckoutInfo): Promise<Order> {
  const ahora = new Date().toISOString();

  const order: Order = {
    id: generarId(),
    createdAt: ahora,
    customer: {
      name: info.name.trim(),
      phone: info.phone.trim(),
      address: info.delivery === 'reparto' ? info.address?.trim() : undefined,
    },
    items: buildOrderItems(summary),
    total: summary.total,
    delivery: info.delivery,
    paymentMethod: info.paymentMethod,
    // Nace sin confirmar: recién se graba, todavía falta que el cliente
    // apriete enviar en WhatsApp y no hay forma de saber si lo hace. Lo
    // confirma el dueño desde el panel cuando ve llegar el mensaje.
    status: 'sin_confirmar',
    payment: 'falta_pagar',
    history: [{ status: 'sin_confirmar', at: ahora }],
  };

  const supabase = createClient();
  const { error } = await supabase.from('orders').insert(orderToRow(order));
  if (error) throw new Error(`No se pudo enviar el pedido: ${error.message}`);

  addOrderToSnapshot(order);
  return order;
}
