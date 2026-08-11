'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from '@/components/icons';

/* ================================================================
   Piezas chicas y compartidas del panel.
================================================================ */

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'normal',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'normal' | 'alerta' | 'ok';
}) {
  const color =
    tone === 'alerta' ? 'text-rojo' : tone === 'ok' ? 'text-verde' : 'text-verde-dark';

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
      <p className="mb-1 text-xs font-semibold text-verde/90">{label}</p>
      <p className={`precio text-3xl font-extrabold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-verde/90">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Se usa como nombre accesible: el interruptor no tiene texto propio. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition-colors ${
        checked ? 'bg-verde' : 'bg-verde/20'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  );
}

/**
 * Aviso de éxito que se va solo.
 *
 * Se anuncia con `role="status"` para que un lector de pantalla lo lea sin
 * robarle el foco a quien está trabajando.
 */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(id);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="animate-fade-in fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-2xl bg-verde-dark px-5 py-3 text-sm font-bold text-white shadow-lg"
    >
      {message}
    </div>
  );
}

/**
 * Diálogo modal, usado para el formulario de producto y el detalle de pedido.
 *
 * `side` lo convierte en panel lateral en pantallas grandes: para revisar un
 * pedido es más cómodo que tape media pantalla y no toda.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Foco al abrir, una sola vez: depende sólo de `open` para que no salte
  // mientras se usan los controles de adentro.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previo;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panel = side
    ? 'ml-auto h-full w-full max-w-lg animate-sheet-in rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none'
    : 'm-auto w-full max-w-lg animate-sheet-in rounded-3xl';

  return (
    <div className={`fixed inset-0 z-50 flex ${side ? '' : 'items-center justify-center p-4'}`}>
      <div className="animate-fade-in absolute inset-0 bg-verde-dark/50" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-dvh flex-col bg-crema shadow-2xl ${panel}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-verde/10 px-5 py-4">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-verde/90 transition-colors hover:bg-verde/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** Campo de formulario con etiqueta y mensaje de error asociados por id. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-verde/90">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-verde/90">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-[11px] font-semibold text-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

/** Clases compartidas por inputs y selects, para que todo el panel se vea igual. */
export const inputClass =
  'w-full rounded-xl border border-verde/15 bg-white px-3 py-2 text-sm font-medium text-verde-dark outline-none transition-colors focus:border-verde/50';

export const selectClass = `${inputClass} cursor-pointer`;
