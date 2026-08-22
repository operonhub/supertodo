'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { BellIcon } from '@/components/icons';
import {
  announce,
  notificationStore,
  primeAlertSound,
  requestNotificationPermission,
} from '@/lib/adminAlerts';
import { connectAdminRealtime } from '@/lib/adminRealtime';

/**
 * Enchufa el canal en vivo del panel y ofrece activar los avisos.
 *
 * Se monta en el layout de `/admin`, así que el pedido suena esté el dueño
 * donde esté dentro del panel. Cuando ya está todo activado y conectado no
 * dibuja nada: un cartel permanente diciendo "funciona" sólo gastaría lugar.
 */
export function AdminAlerts() {
  const permiso = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getServerSnapshot,
  );
  const [live, setLive] = useState(true);
  const [pidiendo, setPidiendo] = useState(false);

  /**
   * El navegador no deja sonar nada hasta que hubo un gesto. Se aprovecha el
   * primero que ocurra —un clic en cualquier parte del panel— en vez de
   * exigirle al dueño que apriete un botón dedicado para desbloquear el audio.
   */
  useEffect(() => {
    const prime = () => primeAlertSound();
    document.addEventListener('pointerdown', prime, { once: true });
    document.addEventListener('keydown', prime, { once: true });

    return () => {
      document.removeEventListener('pointerdown', prime);
      document.removeEventListener('keydown', prime);
    };
  }, []);

  // `pathname` queda fuera de las dependencias a propósito: navegar dentro del
  // panel no puede tirar el canal y volver a levantarlo. El contexto del aviso
  // se lee de `location` en el momento del evento, que es cuando importa.
  useEffect(() => {
    return connectAdminRealtime({
      onAlert: (event) =>
        announce(event, {
          tabVisible: document.visibilityState === 'visible',
          onOrdersPage: window.location.pathname.startsWith('/admin/pedidos'),
        }),
      onLiveChange: setLive,
    });
  }, []);

  async function activar() {
    setPidiendo(true);
    primeAlertSound();
    try {
      await requestNotificationPermission();
    } finally {
      setPidiendo(false);
    }
  }

  const ofrecerPermiso = permiso === 'default';
  if (!ofrecerPermiso && live) return null;

  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {ofrecerPermiso && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-verde-soft px-4 py-3">
          <BellIcon className="h-5 w-5 shrink-0 text-verde" />
          <p className="min-w-40 flex-1 text-sm font-semibold text-verde-dark">
            Activá los avisos y enterate de cada pedido sin tener que mirar el panel.
          </p>
          <button
            type="button"
            onClick={activar}
            disabled={pidiendo}
            className="rounded-full bg-verde px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pidiendo ? 'Esperando…' : 'Activar avisos'}
          </button>
        </div>
      )}

      {!live && (
        <p
          role="status"
          className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
        >
          Se cortó el aviso en vivo. Los pedidos siguen entrando, pero hasta que vuelva la
          conexión la lista se pone al día sola sólo al volver a esta pestaña.
        </p>
      )}
    </div>
  );
}
