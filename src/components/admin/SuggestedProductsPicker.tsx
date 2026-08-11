'use client';

import { selectClass } from '@/components/admin/ui';
import { isActive } from '@/lib/products';
import type { Product } from '@/types';

/** Dos alcanzan para "otra marca" y "otro tamaño": más sería ruido en la ficha. */
const MAX = 2;

/**
 * Elige hasta 2 productos del catálogo como variantes sugeridas de otro.
 *
 * Está calcado del `PromotionPicker` a propósito: mismos chips redondeados,
 * mismas clases compartidas de `ui.tsx`, mismo tono. No es texto libre —se elige
 * entre lo que ya existe— así la ficha del cliente nunca apunta a algo que no
 * está cargado. Al agregarse, cada elegido aparece como chip y se saca con la ×.
 */
export function SuggestedProductsPicker({
  ownId,
  ownName,
  catalog,
  value,
  onChange,
}: {
  /** Id del producto que se está editando. En un alta todavía no existe. */
  ownId?: string;
  /** Nombre del producto editado, sólo para las etiquetas accesibles. */
  ownName: string;
  catalog: Product[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  // Los chips muestran el nombre real, así que se resuelven contra el catálogo
  // entero: aunque un elegido esté inactivo, el dueño lo ve y lo puede sacar.
  const elegidos = value
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);

  // Para agregar sólo se ofrecen productos activos, que no sean el que se está
  // editando ni uno ya elegido: sugerir algo que no aparece en la tienda no sirve.
  const disponibles = catalog.filter(
    (p) => isActive(p) && p.id !== ownId && !value.includes(p.id),
  );

  const lleno = value.length >= MAX;

  function agregar(id: string) {
    if (!id || value.includes(id) || lleno) return;
    onChange([...value, id]);
  }

  function sacar(id: string) {
    onChange(value.filter((x) => x !== id));
  }

  const idSelect = `sugeridos-${ownId ?? 'nuevo'}`;

  return (
    <div className="flex flex-col gap-2">
      {elegidos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {elegidos.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 rounded-full bg-verde px-2.5 py-1 text-xs font-bold text-white"
            >
              {p.name}
              <button
                type="button"
                onClick={() => sacar(p.id)}
                aria-label={`Quitar ${p.name} de las alternativas`}
                className="grid h-4 w-4 place-items-center rounded-full text-sm leading-none text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {lleno ? (
        // El select desaparece al llegar a 2: sacar un chip lo vuelve a habilitar.
        <p className="text-[11px] font-semibold text-verde/90">
          Ya elegiste 2 alternativas, el máximo.
        </p>
      ) : (
        <>
          <label htmlFor={idSelect} className="sr-only">
            Agregar una alternativa para {ownName}
          </label>
          <select
            id={idSelect}
            // Vuelve siempre a vacío: el select es sólo un disparador para
            // agregar, la lista real de elegidos son los chips de arriba.
            value=""
            onChange={(e) => agregar(e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="">Agregar alternativa…</option>
            {disponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.unit}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
