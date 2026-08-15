'use client';

import { useEffect, useState } from 'react';
import { CloseIcon, DownloadIcon, ShareIcon } from '@/components/icons';
import { BUSINESS } from '@/config/business';

/** Chrome no tipa este evento en `lib.dom`: es no estándar, sólo Chromium lo dispara. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'st-install-dismissed';
const DISMISS_DAYS = 7;

function yaEstáInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // `standalone` es una propiedad no estándar de Safari en iOS.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function fueRechazadaHacePoco() {
  const guardado = localStorage.getItem(DISMISS_KEY);
  if (!guardado) return false;
  const días = (Date.now() - Number(guardado)) / (1000 * 60 * 60 * 24);
  return días < DISMISS_DAYS;
}

/**
 * Ofrece instalar la tienda como app.
 *
 * Android/Chrome dispara `beforeinstallprompt` y desde ahí se puede abrir el
 * instalador nativo con `.prompt()`. iOS no tiene ese evento — Apple sólo
 * permite instalar a mano (Compartir → Agregar a inicio) — así que ahí se
 * muestra el paso a paso en vez de un botón que no existe.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // No hace falta guardarlo en estado: el user-agent no cambia en la vida del
  // componente. La comprobación por `typeof` es sólo para no explotar en el
  // render de servidor, donde `navigator` no existe.
  const esIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (yaEstáInstalada() || fueRechazadaHacePoco()) return;

    // Sin service worker registrado, Chrome no considera la página
    // instalable y nunca dispara `beforeinstallprompt`.
    navigator.serviceWorker?.register('/sw.js').catch(() => {});

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener('appinstalled', onInstalled);

    // Un cartel apenas se abre la página compite con lo que la persona vino a
    // hacer, que es mirar el catálogo. Este respiro deja que cargue primero.
    const timer = window.setTimeout(() => setVisible(true), 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  function cerrar() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  async function instalar() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    cerrar();
  }

  // Nada que ofrecer: no es iOS y Chrome no disparó el evento (Firefox,
  // navegador de escritorio, o ya se descartó el prompt nativo antes).
  if (!visible || (!deferred && !esIOS)) return null;

  return (
    <div className="mx-4 mb-4 mt-4 flex items-center gap-3 rounded-2xl bg-verde px-4 py-3 text-white">
      <DownloadIcon className="h-5 w-5 shrink-0" />

      {deferred ? (
        <>
          <p className="flex-1 text-[13px] font-semibold leading-snug">
            Agregá {BUSINESS.name} a tu pantalla de inicio para pedir más rápido la próxima vez.
          </p>
          <button
            type="button"
            onClick={instalar}
            className="shrink-0 rounded-full bg-dorado px-3.5 py-1.5 text-sm font-extrabold text-verde-dark transition hover:brightness-105"
          >
            Instalar
          </button>
        </>
      ) : (
        <p className="flex-1 text-[13px] font-semibold leading-snug">
          Agregá esta página a tu pantalla de inicio: tocá
          <ShareIcon className="mx-1 inline h-4 w-4 -translate-y-0.5" />
          y elegí &quot;Agregar a inicio&quot;.
        </p>
      )}

      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar aviso de instalación"
        className="shrink-0 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
