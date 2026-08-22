import { createClient } from '@/lib/supabase/client';
import type { MessageRole, OrderMessage } from '@/lib/supabaseMessages';

/**
 * Quién habló último en el chat de cada pedido.
 *
 * No se guarda "leído/no leído" en ningún lado a propósito. Un pedido queda
 * pendiente cuando el ÚLTIMO mensaje es del cliente: eso ya significa "te
 * están esperando", se deriva del dato real y no se desincroniza si el dueño
 * atiende desde la compu del local y después desde el celular.
 */
export interface ChatTail {
  lastId: number;
  lastRole: MessageRole;
  at: string;
}

export type ChatTails = Readonly<Record<string, ChatTail>>;

type Listener = () => void;

const SIN_CHATS: ChatTails = {};

let tails: ChatTails = SIN_CHATS;
let inicializado = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Cola de conversación de los últimos mensajes de todo el comercio.
 *
 * Se traen 500 y se descarta todo menos el más nuevo de cada pedido. Para el
 * volumen de un almacén son varias semanas de charla; si algún día no alcanza,
 * el reemplazo natural es una vista `distinct on (order_id)` en Postgres, no
 * subir el número.
 */
async function fetchTails(): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('order_messages')
    .select('id, order_id, sender_role, created_at')
    .order('id', { ascending: false })
    .limit(500);

  if (error) throw new Error(`No se pudo cargar el estado de los chats: ${error.message}`);

  const siguiente: Record<string, ChatTail> = {};
  for (const fila of data ?? []) {
    // Vienen de mayor a menor id: el primero de cada pedido ya es el último.
    if (siguiente[fila.order_id]) continue;
    if (fila.sender_role !== 'customer' && fila.sender_role !== 'owner') continue;

    siguiente[fila.order_id] = {
      lastId: fila.id,
      lastRole: fila.sender_role,
      at: fila.created_at,
    };
  }

  tails = siguiente;
  emit();
}

let consultaEnCurso: Promise<void> | null = null;

/**
 * Si ya hay una lectura en vuelo devuelve esa misma.
 *
 * La carga inicial del store y el "ponerse al día" de cada reconexión se
 * pisan casi siempre, y dos respuestas en desorden dejarían la cola con datos
 * más viejos que un mensaje ya aplicado.
 */
export function refreshChatTails(): Promise<void> {
  consultaEnCurso ??= fetchTails().finally(() => {
    consultaEnCurso = null;
  });
  return consultaEnCurso;
}

/** Suma un mensaje recién llegado (Realtime o envío propio) a la cola. */
export function applyChatMessage(message: Pick<OrderMessage, 'id' | 'order_id' | 'sender_role' | 'created_at'>) {
  const actual = tails[message.order_id];
  // Un INSERT viejo que llega tarde no puede pisar una respuesta más nueva.
  if (actual && actual.lastId >= message.id) return;

  tails = {
    ...tails,
    [message.order_id]: {
      lastId: message.id,
      lastRole: message.sender_role,
      at: message.created_at,
    },
  };
  emit();
}

export const orderChatStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);

    if (!inicializado) {
      inicializado = true;
      fetchTails().catch((err: Error) => console.error(err.message));
    }

    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => tails,
  getServerSnapshot: () => SIN_CHATS,
};

/** Ids de los pedidos donde el cliente escribió último y nadie le contestó. */
export function pendingChatOrderIds(actuales: ChatTails): string[] {
  return Object.entries(actuales)
    .filter(([, tail]) => tail.lastRole === 'customer')
    .map(([orderId]) => orderId);
}
