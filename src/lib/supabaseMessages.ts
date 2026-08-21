import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export type MessageRole = 'customer' | 'owner';

export type OrderMessage = Omit<Tables<'order_messages'>, 'sender_role'> & {
  sender_role: MessageRole;
};

function toOrderMessage(row: Tables<'order_messages'>): OrderMessage {
  if (row.sender_role !== 'customer' && row.sender_role !== 'owner') {
    throw new Error('El mensaje tiene un remitente inválido.');
  }

  return { ...row, sender_role: row.sender_role };
}

/** Historial visible para el usuario actual; RLS decide si es dueño o admin. */
export async function fetchOrderMessages(orderId: string): Promise<OrderMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('order_messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(`No se pudo cargar el chat: ${error.message}`);
  return (data ?? []).map(toOrderMessage);
}

/** El autor lo completa la base con auth.uid(); el cliente no puede falsificarlo. */
export async function sendMessage(
  orderId: string,
  body: string,
  role: MessageRole,
): Promise<OrderMessage> {
  const message = body.trim();
  if (!message) throw new Error('Escribí un mensaje antes de enviarlo.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('order_messages')
    .insert({ order_id: orderId, body: message, sender_role: role })
    .select('*')
    .single();

  if (error) throw new Error(`No se pudo enviar el mensaje: ${error.message}`);
  return toOrderMessage(data);
}

/**
 * Escucha sólo INSERTs del pedido abierto. Devuelve el cleanup para que cada
 * componente quite su canal al cambiar de pedido o desmontarse.
 */
export function subscribeToOrderMessages(
  orderId: string,
  onInsert: (message: OrderMessage) => void,
  onConnectionError?: (message: string) => void,
): () => void {
  const supabase = createClient();
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  // PostgREST toma la sesión al hacer cada request, pero Realtime abre un
  // WebSocket persistente. Se le pasa el JWT antes de conectar para que sus
  // verificaciones RLS no arranquen accidentalmente con el rol anónimo.
  void supabase.auth
    .getSession()
    .then(async ({ data, error }) => {
      if (error) throw error;
      if (!data.session) throw new Error('Ingresá a tu cuenta para usar el chat.');

      await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;

      channel = supabase
        .channel(`order-messages:${orderId}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_messages',
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            try {
              onInsert(toOrderMessage(payload.new as Tables<'order_messages'>));
            } catch (reason) {
              onConnectionError?.(
                reason instanceof Error ? reason.message : 'Llegó un mensaje con formato inválido.',
              );
            }
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onConnectionError?.('El chat perdió la conexión en vivo. Recargá para reconectarlo.');
          }
        });
    })
    .catch((reason: unknown) => {
      if (active) {
        onConnectionError?.(
          reason instanceof Error ? reason.message : 'No se pudo conectar el chat en vivo.',
        );
      }
    });

  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}
