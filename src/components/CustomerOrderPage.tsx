'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CustomerAuthModal } from '@/components/CustomerAuthModal';
import { CustomerOrderChat } from '@/components/CustomerOrderChat';
import { CustomerPageHeader } from '@/components/CustomerPageHeader';
import { OrderStatusTracker } from '@/components/OrderStatusTracker';
import { useCustomer } from '@/hooks/useCustomer';
import { formatARS } from '@/lib/currency';
import { cancelOrder, fetchCustomerOrder, subscribeToCustomerOrder } from '@/lib/customerOrders';
import { formatDateTime } from '@/lib/dates';
import { DELIVERY_LABEL, PAYMENT_LABEL, puedeCancelarlo } from '@/lib/orders';
import type { Order } from '@/types';

/**
 * Cancelar en dos toques.
 *
 * Sin la confirmación, un pulgar en el celular tira abajo un pedido real. Y la
 * pregunta dice qué hacer si se arrepintió tarde, porque el caso más común no
 * es "me equivoqué" sino "cambié de idea cuando ya lo estaban armando".
 */
function CancelOrderButton({ order, onCancelled }: { order: Order; onCancelled: (o: Order) => void }) {
  const [preguntando, setPreguntando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null);
    setCancelando(true);
    try {
      onCancelled(await cancelOrder(order.id));
      setPreguntando(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cancelar el pedido.');
    } finally {
      setCancelando(false);
    }
  }

  if (!preguntando) {
    return (
      <button
        type="button"
        onClick={() => setPreguntando(true)}
        className="w-full rounded-2xl border border-rojo/25 bg-white px-5 py-3 text-sm font-bold text-rojo transition-colors hover:bg-rojo/5"
      >
        Cancelar este pedido
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-rojo/25 bg-rojo/5 p-4">
      <p className="text-sm font-extrabold text-rojo">¿Cancelamos el pedido #{order.id}?</p>
      <p className="mt-1 text-xs font-medium text-rojo/90">
        No se puede deshacer. Si querés cambiar algo en vez de cancelarlo, escribinos por el
        chat de acá abajo.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={cancelando}
          className="flex-1 rounded-xl bg-rojo px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
        <button
          type="button"
          onClick={() => setPreguntando(false)}
          disabled={cancelando}
          className="rounded-xl border border-verde/20 bg-white px-5 py-2.5 text-sm font-bold text-verde transition-colors hover:bg-verde/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          No, dejarlo
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rojo">
          {error}
        </p>
      )}
    </section>
  );
}

function CustomerOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>();
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let receivedRealtimeUpdate = false;
    const unsubscribe = subscribeToCustomerOrder(
      orderId,
      (updated) => {
        if (active) {
          receivedRealtimeUpdate = true;
          setOrder(updated);
        }
      },
      (message) => {
        if (active) setConnectionError(message);
      },
    );

    void fetchCustomerOrder(orderId)
      .then((data) => {
        // Conserva un UPDATE más nuevo si llegó mientras la lectura inicial
        // estaba en vuelo.
        if (active && !receivedRealtimeUpdate) setOrder(data);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'No se pudo cargar el pedido.');
          setOrder(null);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [orderId]);

  if (order === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center text-sm font-semibold text-verde/70">
        Cargando el pedido…
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <section className="rounded-3xl bg-white p-8 text-center shadow-card">
          <h1 className="text-2xl font-extrabold">No encontramos este pedido</h1>
          <p className="mt-2 text-sm text-verde/80">
            Puede que no exista o que pertenezca a otra cuenta.
          </p>
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-rojo">{error}</p>}
          <Link
            href="/cuenta"
            className="mt-5 inline-block rounded-full bg-verde px-5 py-2.5 text-sm font-extrabold text-white hover:bg-verde-dark"
          >
            Ver mis pedidos
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <section className="rounded-2xl bg-verde-dark p-5 text-white shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white/65">Pedido</p>
            <h1 className="text-2xl font-extrabold">#{order.id}</h1>
            <p className="precio mt-1 text-xs text-white/70">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-white/65">Total</p>
            <p className="precio text-2xl font-extrabold text-dorado">{formatARS(order.total)}</p>
          </div>
        </div>
      </section>

      {connectionError && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          {connectionError}
        </p>
      )}

      <OrderStatusTracker status={order.status} />

      {puedeCancelarlo(order) && <CancelOrderButton order={order} onCancelled={setOrder} />}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold text-verde/70">Entrega</p>
          <p className="mt-1 text-sm font-extrabold">{DELIVERY_LABEL[order.delivery]}</p>
          {order.customer.address && (
            <p className="mt-1 break-words text-xs text-verde/80">{order.customer.address}</p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold text-verde/70">Forma de pago</p>
          <p className="mt-1 text-sm font-extrabold">{order.paymentMethod}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-[11px] font-semibold text-verde/70">Pago</p>
          <p className="mt-1 text-sm font-extrabold">{PAYMENT_LABEL[order.payment]}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-extrabold">Productos</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-baseline gap-3 border-b border-verde/10 pb-3 last:border-0 last:pb-0">
              <span className="precio shrink-0 font-extrabold text-verde">{item.quantity}x</span>
              <span className="min-w-0 flex-1 text-sm font-semibold">
                {item.name}
                <span className="block text-[11px] font-medium text-verde/70">{item.unit}</span>
              </span>
              <span className="precio shrink-0 text-sm font-extrabold">{formatARS(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </section>

      {order.notes && (
        <section className="rounded-2xl bg-amber-50 p-4 text-amber-900 shadow-card">
          <h2 className="text-sm font-extrabold">Comentario del pedido</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{order.notes}</p>
        </section>
      )}

      <CustomerOrderChat orderId={order.id} />
    </main>
  );
}

export function CustomerOrderPage({ orderId }: { orderId: string }) {
  const { session, customer, loading, refresh, signOut } = useCustomer();
  const [authOpen, setAuthOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function logoutNonCustomerSession() {
    setError(null);
    try {
      await signOut();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cerrar la sesión.');
    }
  }

  return (
    <div className="min-h-dvh bg-crema">
      <CustomerPageHeader backHref="/cuenta" backLabel="Mis pedidos" />

      {loading ? (
        <main className="mx-auto max-w-3xl px-4 py-16 text-center text-sm font-semibold text-verde/70">
          Cargando tu cuenta…
        </main>
      ) : customer ? (
        <CustomerOrderDetail key={`${customer.id}:${orderId}`} orderId={orderId} />
      ) : (
        <main className="mx-auto max-w-lg px-4 py-12">
          <section className="rounded-3xl bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-extrabold">
              {session ? 'Esta sesión no es una cuenta de cliente' : 'Ingresá para ver este pedido'}
            </h1>
            <p className="mt-2 text-sm text-verde/80">
              {session
                ? 'Cerrá esta sesión interna y entrá con la cuenta que hizo el pedido.'
                : 'Sólo la cuenta dueña del pedido puede consultar su estado y chat.'}
            </p>
            {session && (
              <button
                type="button"
                onClick={logoutNonCustomerSession}
                className="mt-5 rounded-full bg-verde px-5 py-2.5 text-sm font-extrabold text-white hover:bg-verde-dark"
              >
                Cerrar sesión
              </button>
            )}
            {!session && (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="mt-5 rounded-full bg-verde px-5 py-2.5 text-sm font-extrabold text-white hover:bg-verde-dark"
              >
                Ingresar o crear cuenta
              </button>
            )}
            {error && <p role="alert" className="mt-4 text-sm font-semibold text-rojo">{error}</p>}
          </section>
        </main>
      )}

      {!session && !loading && (
        <CustomerAuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthenticated={refresh}
        />
      )}
    </div>
  );
}
