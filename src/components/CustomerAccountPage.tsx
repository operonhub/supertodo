'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CustomerAuthModal } from '@/components/CustomerAuthModal';
import { CustomerPageHeader } from '@/components/CustomerPageHeader';
import { LogOutIcon } from '@/components/icons';
import { getCustomerOrderStage, getCustomerOrderStatusLabel } from '@/components/OrderStatusTracker';
import { useCustomer, type Customer } from '@/hooks/useCustomer';
import { formatARS } from '@/lib/currency';
import {
  fetchCustomerOrders,
  subscribeToCustomerOrders,
} from '@/lib/customerOrders';
import { formatDateTime } from '@/lib/dates';
import { DELIVERY_LABEL, PAYMENT_LABEL } from '@/lib/orders';
import type { Order } from '@/types';

type AuthMode = 'login' | 'signup';

function mergeOrder(orders: Order[], incoming: Order): Order[] {
  const others = orders.filter((order) => order.id !== incoming.id);
  return [incoming, ...others].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

function statusClasses(status: Order['status']) {
  if (status === 'cancelado') return 'bg-rojo/10 text-rojo';
  const stage = getCustomerOrderStage(status);
  if (stage === 1) return 'bg-amber-100 text-amber-800';
  if (stage === 2) return 'bg-verde-soft text-verde';
  return 'bg-sky-100 text-sky-800';
}

function CustomerDashboard({
  customer,
  onSignOut,
}: {
  customer: Customer;
  onSignOut: () => Promise<void>;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const realtimeUpdates = new Set<string>();
    const unsubscribe = subscribeToCustomerOrders(
      customer.id,
      (order) => {
        if (active) {
          realtimeUpdates.add(order.id);
          setOrders((current) => mergeOrder(current, order));
        }
      },
      (message) => {
        if (active) setConnectionError(message);
      },
    );

    void fetchCustomerOrders()
      .then((data) => {
        if (active) {
          // Si un UPDATE llegó mientras el fetch estaba en vuelo, la respuesta
          // inicial no puede volver a pisar ese pedido con un snapshot anterior.
          setOrders((current) =>
            data
              .filter((order) => !realtimeUpdates.has(order.id))
              .reduce(mergeOrder, current),
          );
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'No se pudieron cargar tus pedidos.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [customer.id]);

  async function logout() {
    setSigningOut(true);
    setError(null);
    try {
      await onSignOut();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cerrar la sesión.');
      setSigningOut(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-4xl gap-5 px-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
      <section className="h-fit rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-verde/70">Mi perfil</p>
            <h1 className="text-xl font-extrabold">
              {customer.nombre} {customer.apellido}
            </h1>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-full bg-verde-soft px-3 py-2 text-xs font-extrabold text-verde transition-colors hover:bg-verde/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOutIcon className="h-4 w-4" />
            {signingOut ? 'Saliendo…' : 'Salir'}
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[11px] font-semibold text-verde/70">Email</dt>
            <dd className="break-all font-semibold">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-verde/70">Teléfono</dt>
            <dd className="precio font-semibold">{customer.telefono}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-verde/70">DNI</dt>
            <dd className="precio font-semibold">{customer.dni}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-verde/70">Dirección</dt>
            <dd className="break-words font-semibold">{customer.direccion}</dd>
          </div>
        </dl>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-verde/70">Seguimiento</p>
            <h2 className="text-2xl font-extrabold">Mis pedidos</h2>
          </div>
          <Link href="/" className="text-xs font-extrabold text-verde hover:underline">
            Hacer otro pedido
          </Link>
        </div>

        {connectionError && (
          <p role="status" className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            {connectionError}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-rojo/10 px-4 py-3 text-sm font-semibold text-rojo">
            {error}
          </p>
        )}

        {loading && orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-verde/70 shadow-card">
            Cargando tus pedidos…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-card">
            <p className="text-base font-extrabold">Todavía no hiciste pedidos.</p>
            <p className="mt-1 text-sm text-verde/80">Armá tu carrito y envialo desde la tienda.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-verde px-5 py-2.5 text-sm font-extrabold text-white hover:bg-verde-dark"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const units = order.items.reduce((total, item) => total + item.quantity, 0);
              return (
                <li key={order.id}>
                  <Link
                    href={`/cuenta/pedidos/${order.id}`}
                    className="block rounded-2xl bg-white p-4 shadow-card transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-extrabold">Pedido #{order.id}</p>
                        <p className="precio text-[11px] text-verde/70">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusClasses(order.status)}`}>
                        {getCustomerOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-verde/10 pt-3">
                      <p className="text-xs font-semibold text-verde/80">
                        {units} {units === 1 ? 'unidad' : 'unidades'} · {DELIVERY_LABEL[order.delivery]} · {PAYMENT_LABEL[order.payment]}
                      </p>
                      <p className="precio text-lg font-extrabold">{formatARS(order.total)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

export function CustomerAccountPage() {
  const { session, customer, loading, refresh, signOut } = useCustomer();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authOpen, setAuthOpen] = useState(true);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  async function logoutNonCustomerSession() {
    setLogoutError(null);
    try {
      await signOut();
    } catch (reason) {
      setLogoutError(reason instanceof Error ? reason.message : 'No se pudo cerrar la sesión.');
    }
  }

  return (
    <div className="min-h-dvh bg-crema">
      <CustomerPageHeader backHref="/" backLabel="Volver a la tienda" />

      {loading ? (
        <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm font-semibold text-verde/70">
          Cargando tu cuenta…
        </main>
      ) : customer ? (
        <CustomerDashboard key={customer.id} customer={customer} onSignOut={signOut} />
      ) : (
        <main className="mx-auto max-w-lg px-4 py-12">
          <section className="rounded-3xl bg-white p-6 text-center shadow-card sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-wider text-verde/60">Tu cuenta</p>
            <h1 className="mt-2 text-2xl font-extrabold">
              {session ? 'Esta sesión no es una cuenta de cliente' : 'Ingresá para ver tus pedidos'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-verde/80">
              {session
                ? 'Cerrá esta sesión interna para entrar con una cuenta de cliente.'
                : 'Desde acá podés seguir el estado de cada pedido y hablar con Super Todo.'}
            </p>

            {session ? (
              <button
                type="button"
                onClick={logoutNonCustomerSession}
                className="mt-5 rounded-full bg-verde px-5 py-2.5 text-sm font-extrabold text-white hover:bg-verde-dark"
              >
                Cerrar sesión
              </button>
            ) : (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="rounded-full bg-verde px-5 py-2.5 text-sm font-extrabold text-white hover:bg-verde-dark"
                >
                  Ingresar
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="rounded-full bg-dorado px-5 py-2.5 text-sm font-extrabold text-verde-dark hover:brightness-105"
                >
                  Crear cuenta
                </button>
              </div>
            )}

            {logoutError && <p role="alert" className="mt-4 text-sm font-semibold text-rojo">{logoutError}</p>}
          </section>
        </main>
      )}

      {!session && !loading && (
        <CustomerAuthModal
          key={authMode}
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode={authMode}
          onAuthenticated={refresh}
        />
      )}
    </div>
  );
}
