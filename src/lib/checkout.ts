import { addOrderToSnapshot, refreshProducts } from '@/lib/stores';
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

/**
 * Errores del trigger `price_order()` que el cliente puede entender y resolver.
 *
 * La base es la que manda con los precios: acá sólo se traduce, y en los dos
 * casos que dependen del catálogo se lo vuelve a leer para que el carrito
 * muestre la cuenta nueva antes de que el cliente reintente.
 */
const ERRORES_DE_PRECIO: Record<string, { mensaje: string; releerCatálogo: boolean }> = {
  PT001: {
    mensaje: 'Los precios cambiaron mientras armabas el pedido. Mirá el total actualizado y volvé a enviarlo.',
    releerCatálogo: true,
  },
  PT002: {
    mensaje: 'Uno de los productos ya no está disponible. Lo sacamos del catálogo: revisá el carrito.',
    releerCatálogo: true,
  },
  PT003: {
    mensaje: 'Hay algo raro en las cantidades del pedido. Revisá el carrito y probá de nuevo.',
    releerCatálogo: false,
  },
};

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

  const { data, error } = await supabase
    .from('orders')
    .insert({ ...orderToRow(order), customer_id: user.id })
    .select('items, total')
    .single();

  if (error) {
    const conocido = ERRORES_DE_PRECIO[error.code];
    if (!conocido) throw new Error(`No se pudo enviar el pedido: ${error.message}`);

    if (conocido.releerCatálogo) await refreshProducts().catch(() => {});
    throw new Error(conocido.mensaje);
  }

  /*
   * Se relee lo que quedó guardado en vez de confiar en el objeto local: el
   * trigger `price_order()` reescribe items y total desde `products`, así que
   * la fila puede diferir de lo que se mandó. Sin esto, el detalle al que se
   * navega justo después mostraría la versión del navegador y no la real.
   */
  const guardado: Order = {
    ...order,
    items: data.items as unknown as OrderItem[],
    total: Number(data.total),
  };

  addOrderToSnapshot(guardado);
  return guardado;
}
