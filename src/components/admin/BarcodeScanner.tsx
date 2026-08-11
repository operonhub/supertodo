'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { CloseIcon } from '@/components/icons';

/**
 * Overlay de cámara para leer un código de barras en vivo.
 *
 * `facingMode: 'environment'` pide la cámara trasera del celular — sin esto,
 * `getUserMedia` puede arrancar con la frontal, inútil para escanear. No hay
 * `BarcodeDetector` nativo en Safari/iOS, así que la decodificación corre en
 * JS puro vía `@zxing/browser`, cargado dinámicamente para no sumarlo al
 * bundle inicial del panel.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let cancelado = false;
    let detectado = false;

    async function iniciar() {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const lector = new BrowserMultiFormatReader();

      try {
        const c = await lector.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (resultado) => {
            if (resultado && !cancelado && !detectado) {
              detectado = true;
              onDetectedRef.current(resultado.getText());
            }
          },
        );

        if (cancelado) {
          c.stop();
        } else {
          controls = c;
        }
      } catch {
        if (!cancelado) {
          setError('No se pudo acceder a la cámara. Revisá los permisos del navegador e intentá de nuevo.');
        }
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      controls?.stop();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold text-white">Apuntá al código de barras</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-32 w-64 rounded-2xl border-2 border-white/70" />
        </div>
      </div>

      {error && (
        <div className="px-4 py-4">
          <p role="alert" className="mb-3 text-sm font-semibold text-white">
            {error}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-verde-dark"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
