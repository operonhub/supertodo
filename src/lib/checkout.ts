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
  notes?: string;
}

/**
 * Id corto y legible, generado en el navegador. No hace falta releer la fila
 * después del INSERT: el `Order` que arma esta función ya contiene el mismo
 * snapshot que se persistió y permite navegar directo a su detalle.
 */
function generarId(): string {
  const marca = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 6);
  return `${marca}${azar}`.toUpperCase();
}

/** Congela nombre, precio y promoción de cada producto al crear el pedido. */
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
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Ingresá a tu cuenta antes de enviar el pedido.');
  }

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
    status: 'nuevo',
    payment: 'falta_pagar',
    notes: info.notes?.trim() || undefined,
    history: [{ status: 'nuevo', at: ahora }],
  };

  const { error } = await supabase
    .from('orders')
    .insert({ ...orderToRow(order), customer_id: user.id });
  if (error) throw new Error(`No se pudo enviar el pedido: ${error.message}`);

  addOrderToSnapshot(order);
  return order;
}
