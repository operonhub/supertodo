'use client';

import { useState } from 'react';
import { inputClass, selectClass } from '@/components/admin/ui';
import { formatARS } from '@/lib/currency';
import { explainPromotion, getUnitPrice } from '@/lib/products';
import type { Product, Promotion, PromotionType } from '@/types';

/** Los descuentos que se usan casi siempre. "Otro" abre el campo libre. */
const PORCENTAJES = [10, 20, 30];

const OPCIONES: { value: PromotionType | 'ninguna'; label: string }[] = [
  { value: 'ninguna', label: 'Sin oferta' },
  { value: 'percent', label: 'Descuento %' },
  { value: '3x2', label: '3x2' },
  { value: '2x1', label: '2x1' },
];

/**
 * Selector de oferta de un producto.
 *
 * Nunca pide un precio: el dueño elige el tipo y, si es descuento, el
 * porcentaje. El precio final se calcula del precio de lista. Escribir el precio
 * rebajado a mano —como era antes— es lento y se presta a errores de cuenta.
 *
 * Es fluido a propósito (`flex-wrap`, sin anchos fijos) para entrar tanto en una
 * celda de tabla como en una tarjeta angosta.
 */
export function PromotionPicker({
  product,
  onChange,
}: {
  product: Product;
  onChange: (promotion: Promotion | null) => void;
}) {
  const promo = product.promotion;
  const esPersonalizado =
    promo?.type === 'percent' && promo.percent !== undefined && !PORCENTAJES.includes(promo.percent);

  const [libre, setLibre] = useState(esPersonalizado);

  function cambiarTipo(valor: string) {
    if (valor === 'ninguna') {
      setLibre(false);
      onChange(null);
      return;
    }
    if (valor === 'percent') {
      // Arranca en el primer descuento de la lista, no en vacío: así el precio
      // final se ve al instante y el dueño ajusta desde algo concreto.
      onChange({ type: 'percent', percent: promo?.percent ?? PORCENTAJES[0] });
      return;
    }
    setLibre(false);
    onChange({ type: valor as PromotionType });
  }

  const idPorcentaje = `promo-otro-${product.id}`;

  return (
    <div className="flex flex-col gap-2">
      <select
        value={promo?.type ?? 'ninguna'}
        onChange={(e) => cambiarTipo(e.target.value)}
        aria-label={`Tipo de oferta de ${product.name}`}
        className={`${selectClass} w-36`}
      >
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {promo?.type === 'percent' && (
        <div className="flex flex-wrap items-center gap-1">
          {PORCENTAJES.map((p) => {
            const activo = !libre && promo.percent === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={activo}
                onClick={() => {
                  setLibre(false);
                  onChange({ type: 'percent', percent: p });
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                  activo
                    ? 'bg-verde text-white'
                    : 'border border-verde/15 bg-white text-verde hover:border-verde/40'
                }`}
              >
                {p}%
              </button>
            );
          })}

          <button
            type="button"
            aria-pressed={libre}
            onClick={() => setLibre(true)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
              libre
                ? 'bg-verde text-white'
                : 'border border-verde/15 bg-white text-verde hover:border-verde/40'
            }`}
          >
            Otro
          </button>

          {libre && (
            <span className="flex items-center gap-1">
              <label htmlFor={idPorcentaje} className="sr-only">
                Porcentaje de descuento de {product.name}
              </label>
              <input
                id={idPorcentaje}
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={promo.percent ?? ''}
                onChange={(e) => {
                  // Se acota a 1-99: 0 no es un descuento y 100 regalaría el producto.
                  const n = Math.min(99, Math.max(1, Number(e.target.value) || 1));
                  onChange({ type: 'percent', percent: n });
                }}
                className={`${inputClass} precio w-16 px-2 py-1 text-right`}
              />
              <span className="text-xs font-bold text-verde/90">%</span>
            </span>
          )}
        </div>
      )}

      {promo && (
        <p className="text-[11px] font-semibold text-verde/90">
          {promo.type === 'percent'
            ? `Queda en ${formatARS(getUnitPrice(product))}`
            : explainPromotion(promo)}
        </p>
      )}
    </div>
  );
}
