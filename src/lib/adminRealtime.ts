import type { AlertEvent } from '@/lib/adminAlerts';
import { applyChatMessage, refreshChatTails } from '@/lib/orderChatStore';
import { applyRealtimeOrder, dropOrderFromSnapshot, knowsOrder, refreshOrders } from '@/lib/stores';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

/**
 * Canal en vivo del panel: pedidos y chat.
 *
 * Antes el aviso de "entró un pedido" era el WhatsApp que abría el checkout.
 * Ese canal ya no existe, así que el panel tiene que enterarse solo. Se monta
 * una vez en el layout de `/admin` y vale para todas las pantallas: el dueño
 * puede estar cargando productos y el pedido igual suena.
 */

export interface AdminRealtimeHandlers {
  /** Un evento que quizás merezca sonar; la política vive en `adminAlerts`. */
  onAlert: (event: AlertEvent) => void;
  /** `false` cuando se cae el socket: la UI avisa que dejó de ser en vivo. */
  onLiveChange: (live: boolean) => void;
}

export function connectAdminRealtime({ onAlert, onLiveChange }: AdminRealtimeHandlers): () => void {
  const supabase = createClient();
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  /**
   * Mientras el socket estuvo caído los eventos se perdieron y no se reenvían.
   * Por eso cada reconexión —y cada vuelta a la pestaña— arranca releyendo
   * todo: sin esto, un pedido que entró con el celular bloqueado no aparecería
   * nunca, que es justo el caso que este módulo viene a resolver.
   */
  async function ponerseAlDía() {
    if (!active) return;

    await Promise.allSettled([refreshOrders(), refreshChatTails()]);
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void ponerseAlDía();
  }

  void supabase.auth
    .getSession()
    .then(async ({ data, error }) => {
      if (error) throw error;
      if (!data.session) throw new Error('Sesión vencida.');

      // Realtime mantiene un WebSocket propio: sin el JWT arranca como anónimo
      // y las policies de `orders` y `order_messages` no devuelven nada.
      await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;

      channel = supabase
        .channel(`admin-live:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            const id = (payload.new as Tables<'orders'>).id;
            // Se pregunta ANTES de aplicar: después de aplicarlo, todo pedido
            // "ya está en la lista" y no habría cómo distinguir un alta real
            // del eco de una escritura propia.
            const esNuevo = !knowsOrder(id);

            void applyRealtimeOrder(id).then((order) => {
              if (active && order && esNuevo) onAlert({ kind: 'order', order });
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            void applyRealtimeOrder((payload.new as Tables<'orders'>).id);
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'orders' },
          (payload) => {
            const id = (payload.old as Partial<Tables<'orders'>>).id;
            if (id) dropOrderFromSnapshot(id);
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_messages' },
          (payload) => {
            const fila = payload.new as Tables<'order_messages'>;
            if (fila.sender_role !== 'customer' && fila.sender_role !== 'owner') return;

            applyChatMessage({ ...fila, sender_role: fila.sender_role });

            // El eco de lo que escribió el propio dueño no se anuncia.
            if (fila.sender_role !== 'customer') return;
            onAlert({ kind: 'message', orderId: fila.order_id, body: fila.body });
          },
        )
        .subscribe((status) => {
          if (!active) return;

          if (status === 'SUBSCRIBED') {
            onLiveChange(true);
            void ponerseAlDía();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            onLiveChange(false);
          }
        });

      document.addEventListener('visibilitychange', onVisibilityChange);
    })
    .catch(() => {
      if (active) onLiveChange(false);
    });

  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (channel) void supabase.removeChannel(channel);
  };
}
