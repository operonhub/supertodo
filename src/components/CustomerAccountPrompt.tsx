'use client';

import { useState, useSyncExternalStore } from 'react';
import { CustomerAuthModal } from '@/components/CustomerAuthModal';
import { CloseIcon } from '@/components/icons';
import { useCustomer } from '@/hooks/useCustomer';

const DISMISS_KEY = 'st-customer-account-prompt-dismissed';
const subscribeNothing = () => () => {};

/** Aviso liviano; el checkout de la Fase B será el gate obligatorio. */
export function CustomerAccountPrompt() {
  const { session, customer, loading, signOut } = useCustomer();
  const wasDismissed = useSyncExternalStore(
    subscribeNothing,
    () => localStorage.getItem(DISMISS_KEY) === '1',
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissedNow(true);
  }

  async function logout() {
    setLogoutError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : 'No se pudo cerrar la sesión.');
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) return null;

  if (customer) {
    return (
      <aside className="fixed bottom-24 right-4 z-20 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-verde/10">
        <p className="text-xs font-semibold text-verde/90">Cuenta de cliente</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="max-w-40 truncate text-sm font-extrabold text-verde-dark">
            {customer.nombre} {customer.apellido}
          </p>
          <button
            type="button"
            onClick={logout}
            disabled={signingOut}
            className="rounded-full bg-verde-soft px-3 py-1.5 text-xs font-extrabold text-verde-dark transition-colors hover:bg-verde/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Saliendo…' : 'Salir'}
          </button>
        </div>
        {logoutError && (
          <p role="alert" className="mt-2 max-w-64 text-xs font-semibold text-rojo">
            {logoutError}
          </p>
        )}
      </aside>
    );
  }

  // Una sesión sin perfil es la del admin; no se le ofrece crear otra cuenta
  // mientras está trabajando con sus credenciales internas.
  if (session || wasDismissed || dismissedNow) return null;

  return (
    <>
      <aside className="fixed inset-x-4 bottom-24 z-20 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-verde/10 sm:left-auto sm:w-full sm:max-w-sm">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso de cuenta"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-verde/70 transition-colors hover:bg-verde/10 hover:text-verde-dark"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <p className="pr-7 text-sm font-extrabold text-verde-dark">Pedí siempre desde la tienda</p>
        <p className="mt-1 pr-6 text-xs leading-relaxed text-verde/90">
          Ingresá o creá tu cuenta para enviar pedidos y seguir su estado.
        </p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="mt-3 rounded-full bg-dorado px-4 py-2 text-xs font-extrabold text-verde-dark transition hover:brightness-105"
        >
          Ingresar o crear cuenta
        </button>
      </aside>

      <CustomerAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
