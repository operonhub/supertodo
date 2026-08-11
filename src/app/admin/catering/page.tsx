'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge, Toast } from '@/components/admin/ui';
import { AlertIcon, PlusIcon } from '@/components/icons';
import { CATERING_INQUIRIES } from '@/data/catering';
import { formatLongDate } from '@/lib/dates';
import type { CateringStatus } from '@/types';

const ESTADO_LABEL: Record<CateringStatus, string> = {
  nueva: 'Nueva consulta',
  presupuesto: 'Presupuesto enviado',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
};

const ESTADO_STYLE: Record<CateringStatus, string> = {
  nueva: 'bg-sky-100 text-sky-800',
  presupuesto: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-verde-soft text-verde',
  realizado: 'bg-gray-100 text-gray-700',
};

/** Las columnas se muestran en el orden en que avanza una consulta. */
const ORDEN: CateringStatus[] = ['nueva', 'presupuesto', 'confirmado', 'realizado'];

export default function CateringPage() {
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Catering"
        subtitle={`${CATERING_INQUIRIES.length} consultas registradas`}
        actions={
          <button
            type="button"
            onClick={() => setAviso('Falta definir el formulario de consulta con el dueño')}
            className="flex items-center gap-2 rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white shadow-card transition-colors hover:bg-verde-dark"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva consulta
          </button>
        }
      />

      {/* Es lo primero que se lee a propósito: la sección está a medio hacer y
          conviene que quede explícito antes de mostrarle la pantalla al dueño. */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-dashed border-dorado bg-dorado/10 px-4 py-4">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-dorado-dark" />
        <div>
          <p className="text-sm font-extrabold text-dorado-dark">Pendiente de definir con el dueño</p>
          <p className="mt-1 text-sm leading-relaxed text-verde/90">
            Menús, precios, fechas disponibles, seña y logística. También cómo quiere cotizar: por
            persona, por combo cerrado o armado a medida. Hasta tenerlo, esta pantalla es sólo una
            vista de las consultas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ORDEN.map((estado) => {
          const consultas = CATERING_INQUIRIES.filter((c) => c.status === estado);

          return (
            <section key={estado} className="rounded-2xl bg-verde/5 p-3">
              <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-extrabold">
                {ESTADO_LABEL[estado]}
                <span className="precio ml-auto text-[11px] font-bold text-verde/90">
                  {consultas.length}
                </span>
              </h2>

              <ul className="space-y-2.5">
                {consultas.map((c) => (
                  <li key={c.id} className="rounded-xl bg-white p-3.5 shadow-sm">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold leading-tight">{c.customer.name}</p>
                      <Badge className={`${ESTADO_STYLE[c.status]} shrink-0`}>{c.people} pers.</Badge>
                    </div>

                    <p className="text-[11px] text-verde/90">{c.event}</p>
                    <p className="precio mt-1 text-[11px] font-semibold text-verde">
                      {formatLongDate(`${c.eventDate}T12:00:00`)}
                    </p>

                    {c.notes && (
                      <p className="mt-2 border-t border-verde/10 pt-2 text-[11px] leading-relaxed text-verde/90">
                        {c.notes}
                      </p>
                    )}
                  </li>
                ))}

                {consultas.length === 0 && (
                  <li className="px-1 py-4 text-center text-[11px] text-verde/90">Sin consultas</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}
