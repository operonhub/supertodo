'use client';

import type { ReactNode } from 'react';
import { formatLongDate } from '@/lib/dates';
import { useHydrated } from '@/hooks/useStores';

/**
 * Encabezado de las pantallas del panel.
 *
 * La fecha se calcula en el cliente a propósito: las páginas se prerenderizan
 * durante el build, así que si "hoy" se resolviera en el render, el HTML del
 * build quedaría con la fecha del deploy y React marcaría un error de
 * hidratación. Hasta que hidrata se reserva el espacio con un bloque vacío para
 * que el título no salte.
 */
export function PageHeader({
  title,
  showDate = false,
  subtitle,
  actions,
}: {
  title: string;
  showDate?: boolean;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const hydrated = useHydrated();

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="mr-auto min-w-0">
        <h1 className="text-2xl font-extrabold">
          {title}
          {showDate && (
            <span className="font-semibold text-verde/90">
              {' — '}
              {hydrated ? formatLongDate() : <span className="inline-block h-5 w-40 align-middle" />}
            </span>
          )}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-verde/90">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
