'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/admin/ui';
import { formatTime } from '@/lib/dates';
import {
  fetchOrderMessages,
  sendMessage,
  subscribeToOrderMessages,
  type MessageRole,
  type OrderMessage,
} from '@/lib/supabaseMessages';

function mergeMessage(messages: OrderMessage[], incoming: OrderMessage): OrderMessage[] {
  const withoutPrevious = messages.filter((message) => message.id !== incoming.id);
  return [...withoutPrevious, incoming].sort((a, b) => {
    const byDate = a.created_at.localeCompare(b.created_at);
    return byDate || a.id - b.id;
  });
}

/** Chat compartido: los wrappers de admin/cliente fijan el rol que RLS valida. */
export function OrderChat({
  orderId,
  role,
  title,
}: {
  orderId: string;
  role: MessageRole;
  title: string;
}) {
  return <OrderChatSession key={`${role}:${orderId}`} orderId={orderId} role={role} title={title} />;
}

function OrderChatSession({
  orderId,
  role,
  title,
}: {
  orderId: string;
  role: MessageRole;
  title: string;
}) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fieldId = `order-chat-${role}-${orderId}`;

  useEffect(() => {
    let active = true;

    // Suscribirse antes del fetch evita perder un INSERT entre la lectura del
    // historial y la apertura del canal. `mergeMessage` quita duplicados.
    const unsubscribe = subscribeToOrderMessages(
      orderId,
      (message) => {
        if (active) setMessages((current) => mergeMessage(current, message));
      },
      (message) => {
        if (active) setConnectionError(message);
      },
    );

    void fetchOrderMessages(orderId)
      .then((history) => {
        if (!active) return;
        setMessages((current) => history.reduce(mergeMessage, current));
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'No se pudo cargar el chat.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || sending) return;

    setError(null);
    setSending(true);
    try {
      const message = await sendMessage(orderId, draft, role);
      setMessages((current) => mergeMessage(current, message));
      setDraft('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-4">
      <h3 className="mb-1 text-sm font-extrabold">{title}</h3>
      <p className="mb-3 text-[11px] text-verde/90">Los mensajes nuevos aparecen en vivo.</p>

      <div
        role="log"
        aria-live="polite"
        aria-busy={loading}
        aria-label={`Mensajes del pedido ${orderId}`}
        className="mb-3 max-h-64 min-h-28 space-y-2 overflow-y-auto rounded-xl bg-crema p-3"
      >
        {loading && messages.length === 0 ? (
          <p className="py-8 text-center text-xs font-semibold text-verde/70">Cargando mensajes…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs font-semibold text-verde/70">
            Todavía no hay mensajes en este pedido.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_role === role;
            const sender = mine
              ? 'Vos'
              : message.sender_role === 'owner'
                ? 'Super Todo'
                : 'Cliente';

            return (
              <article
                key={message.id}
                className={`w-fit max-w-[85%] rounded-2xl px-3 py-2 ${
                  mine ? 'ml-auto bg-verde text-white' : 'bg-white text-verde-dark shadow-sm'
                }`}
              >
                <div className="mb-0.5 flex items-center gap-2 text-[10px] font-bold opacity-75">
                  <span>{sender}</span>
                  <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
              </article>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {connectionError && (
        <p role="status" className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          {connectionError}
        </p>
      )}

      <form onSubmit={submit}>
        <Field label="Mensaje" htmlFor={fieldId} error={error ?? undefined}>
          <textarea
            id={fieldId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={`${inputClass} resize-y`}
            placeholder="Escribí un mensaje sobre este pedido…"
          />
        </Field>

        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="w-full rounded-xl bg-verde px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? 'Enviando…' : 'Enviar mensaje'}
        </button>
      </form>
    </section>
  );
}
