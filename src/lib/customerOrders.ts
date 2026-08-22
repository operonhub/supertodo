import { rowToOrder } from '@/lib/supabase/mappers';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import type { Order } from '@/types';

type OrderRow = Tables<'orders'>;

/** Pedidos visibles para la cuenta actual; RLS limita la consulta al dueño. */
export async function fetchCustomerOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar tus pedidos: ${error.message}`);
  return (data ?? []).map(rowToOrder);
}

/** Devuelve null tanto para un id inexistente como para uno ajeno a la cuenta. */
export async function fetchCustomerOrder(orderId: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();

  if (error) throw new Error(`No se pudo cargar el pedido: ${error.message}`);
  return data ? rowToOrder(data) : null;
}

/**
 * Errores del RPC `cancel_order()` que el cliente puede entender.
 *
 * `PT005` no distingue entre un pedido inexistente y uno de otra cuenta: la
 * base contesta lo mismo en los dos casos a propósito, y el mensaje lo respeta.
 */
const ERRORES_DE_CANCELACIÓN: Record<string, string> = {
  PT004: 'El pedido ya entró en preparación, así que no se puede cancelar solo. Escribinos por el chat y lo vemos.',
  PT005: 'No encontramos ese pedido en tu cuenta.',
};

/**
 * Cancela un pedido propio.
 *
 * Va por RPC y no por un UPDATE directo porque el cliente no tiene —ni debe
 * tener— permiso para escribir en `orders`: la base valida que el pedido sea
 * suyo y que todavía no lo hayan empezado a preparar.
 */
export async function cancelOrder(orderId: string): Promise<Order> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId });

  if (error) {
    throw new Error(
      ERRORES_DE_CANCELACIÓN[error.code] ?? `No se pudo cancelar el pedido: ${error.message}`,
    );
  }

  return rowToOrder(data as OrderRow);
}

function subscribeToOrderUpdates(
  column: 'customer_id' | 'id',
  value: string,
  onUpdate: (order: Order) => void,
  onConnectionError?: (message: string) => void,
): () => void {
  const supabase = createClient();
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  // Realtime mantiene un WebSocket: se fija el JWT antes de suscribirse para
  // que las policies de `orders` se evalúen como la cuenta autenticada.
  void supabase.auth
    .getSession()
    .then(async ({ data, error }) => {
      if (error) throw error;
      if (!data.session) throw new Error('Ingresá a tu cuenta para seguir el pedido.');

      await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;

      channel = supabase
        .channel(`customer-orders:${column}:${value}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `${column}=eq.${value}`,
          },
          (payload) => onUpdate(rowToOrder(payload.new as OrderRow)),
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onConnectionError?.(
              'Se perdió la actualización en vivo. Recargá la página para reconectarla.',
            );
          }
        });
    })
    .catch((reason: unknown) => {
      if (active) {
        onConnectionError?.(
          reason instanceof Error
            ? reason.message
            : 'No se pudo conectar la actualización en vivo.',
        );
      }
    });

  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}

/** Actualizaciones de cualquier pedido de la cuenta, para la lista. */
export function subscribeToCustomerOrders(
  customerId: string,
  onUpdate: (order: Order) => void,
  onConnectionError?: (message: string) => void,
) {
  return subscribeToOrderUpdates('customer_id', customerId, onUpdate, onConnectionError);
}

/** Actualizaciones del pedido abierto, para el tracker de detalle. */
export function subscribeToCustomerOrder(
  orderId: string,
  onUpdate: (order: Order) => void,
  onConnectionError?: (message: string) => void,
) {
  return subscribeToOrderUpdates('id', orderId, onUpdate, onConnectionError);
}
