'use client';

import { PlusIcon } from '@/components/icons';
import { ProductImage } from '@/components/ProductImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { getCategoryName } from '@/data/categories';
import { useSettings } from '@/hooks/useStores';
import { formatARS } from '@/lib/currency';
import { describePromotion, explainPromotion, getUnitPrice } from '@/lib/products';
import type { Product } from '@/types';

type ProductCardProps = {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Variantes sugeridas ya resueltas contra el catálogo (ver `resolveSuggestions`). */
  suggestions: Product[];
};

export function ProductCard({
  product,
  quantity,
  onIncrement,
  onDecrement,
  suggestions,
}: ProductCardProps) {
  const settings = useSettings();
  const promo = product.promotion;
  const precioFinal = getUnitPrice(product);

  /**
   * Sólo el descuento porcentual baja el precio unitario, y sólo ahí se tacha el
   * precio de lista. En 3x2 y 2x1 la unidad vale lo mismo: tacharla sería
   * decirle al cliente que bajó algo que no bajó.
   */
  const bajaElUnitario = precioFinal < product.price;

  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-2.5 shadow-card transition-shadow hover:shadow-lg lg:p-3">
      <div className="relative mb-2.5 lg:mb-3">
        <ProductImage product={product} className="h-24 rounded-xl sm:h-32 lg:h-44" />

        {promo && (
          <span
            title={explainPromotion(promo)}
            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              // Rojo para el descuento, dorado para las promos por cantidad: son
              // dos cosas distintas y conviene que se lean distinto de un vistazo.
              promo.type === 'percent' ? 'bg-rojo text-white' : 'bg-dorado text-verde-dark'
            }`}
          >
            {describePromotion(promo)}
          </span>
        )}

        {!product.available && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/75">
            <span className="rounded-full bg-verde-dark/80 px-2.5 py-1 text-[10px] font-bold text-white">
              Sin stock
            </span>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold leading-tight lg:text-sm">{product.name}</p>
      <p className="mt-0.5 text-[11px] text-verde/80 lg:text-xs">
        {product.unit} · {getCategoryName(settings.categories, product.category)}
      </p>

      {/* Variantes que cargó el dueño: texto, no botón. Le avisan al cliente que
          había otra opción por si esto no está, sin reemplazar al producto. */}
      {suggestions.length > 0 && (
        <p className="mt-1 text-[11px] leading-tight text-verde/70">
          <span className="font-semibold">Alternativas:</span>{' '}
          {suggestions.map((s) => s.name).join(' · ')}
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div>
          <p className="precio text-lg font-extrabold leading-none lg:text-xl">
            {formatARS(precioFinal)}
          </p>
          {bajaElUnitario ? (
            <p className="precio mt-0.5 text-[11px] text-verde/80 line-through">
              {formatARS(product.price)}
            </p>
          ) : (
            promo && (
              <p className="mt-0.5 text-[11px] font-semibold text-dorado-dark">
                {explainPromotion(promo)}
              </p>
            )
          )}
        </div>

        {!product.available ? (
          <span className="text-[11px] font-semibold text-verde/80">No disponible</span>
        ) : quantity === 0 ? (
          <button
            type="button"
            onClick={onIncrement}
            aria-label={`Agregar ${product.name} al pedido`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-verde text-white shadow-md transition-colors hover:bg-verde-dark lg:h-10 lg:w-10"
          >
            <PlusIcon className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        ) : (
          <QuantityStepper
            quantity={quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            productName={product.name}
          />
        )}
      </div>
    </article>
  );
}
