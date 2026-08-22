'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CustomerAuthModal } from '@/components/CustomerAuthModal';
import { BagIcon, ChevronIcon, LogOutIcon, UserIcon } from '@/components/icons';
import { useCustomer } from '@/hooks/useCustomer';

/**
 * La cuenta, en el header.
 *
 * Antes esto era un cartel flotante abajo a la derecha que tapaba el catálogo
 * y, si el visitante lo cerraba, se guardaba el descarte en `localStorage`: no
 * volvía a ver por dónde entrar nunca más. En el header está siempre en el
 * mismo lugar, que es donde todo el mundo va a buscarlo.
 */
export function AccountMenu() {
  const { session, customer, loading, refresh, signOut } = useCustomer();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;

    function alTocarAfuera(event: PointerEvent) {
      if (!contenedor.current?.contains(event.target as Node)) setMenuAbierto(false);
    }
    function alTeclear(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAbierto(false);
    }

    document.addEventListener('pointerdown', alTocarAfuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('pointerdown', alTocarAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [menuAbierto]);

  async function salir() {
    setError(null);
    setSaliendo(true);
    try {
      await signOut();
      setMenuAbierto(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cerrar la sesión.');
    } finally {
      setSaliendo(false);
    }
  }

  // Un hueco del mismo tamaño mientras carga: si apareciera de golpe, el
  // buscador y el logo se moverían justo cuando alguien va a tocarlos.
  if (loading) {
    return <div className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-white/10" aria-hidden="true" />;
  }

  // Sesión sin perfil de cliente: es alguien del equipo con sus credenciales
  // internas. No se le ofrece crear una cuenta de comprador mientras trabaja.
  if (session && !customer) return null;

  if (!customer) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-xs font-extrabold text-white transition-colors hover:bg-white/25"
        >
          <UserIcon className="h-4 w-4" />
          Ingresar
        </button>

        <CustomerAuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthenticated={refresh}
        />
      </>
    );
  }

  return (
    <div ref={contenedor} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        aria-expanded={menuAbierto}
        aria-haspopup="menu"
        className="flex h-9 max-w-40 items-center gap-2 rounded-full bg-white/15 px-3 text-xs font-extrabold text-white transition-colors hover:bg-white/25"
      >
        <UserIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{customer.nombre}</span>
        <ChevronIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${menuAbierto ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {menuAbierto && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 w-60 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-verde/10"
        >
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold text-verde/70">
            <span className="block truncate text-sm font-extrabold text-verde-dark">
              {customer.nombre} {customer.apellido}
            </span>
            <span className="block truncate">{customer.email}</span>
          </p>

          <Link
            href="/cuenta"
            role="menuitem"
            onClick={() => setMenuAbierto(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-verde-dark transition-colors hover:bg-verde-soft"
          >
            <BagIcon className="h-4 w-4 text-verde" />
            Mis pedidos
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={salir}
            disabled={saliendo}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-verde-dark transition-colors hover:bg-verde-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOutIcon className="h-4 w-4 text-verde" />
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>

          {error && (
            <p role="alert" className="px-3 pb-1 pt-2 text-[11px] font-semibold text-rojo">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
