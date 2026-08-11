'use client';

import { PlusIcon } from '@/components/icons';
import { ProductImage } from '@/components/ProductImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { getCategoryName } from '@/data/categories';
import { formatARS, getDiscountPercent } from '@/lib/currency';
import type { Product } from '@/types';

type ProductCardProps = {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function ProductCard({ product, quantity, onIncrement, onDecrement }: ProductCardProps) {
  const descuento = getDiscountPercent(product.price, product.previousPrice);
  const enOferta = descuento > 0;

  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-2.5 shadow-card transition-shadow hover:shadow-lg">
      <div className="relative mb-2.5">
        <ProductImage product={product} className="h-24 rounded-xl sm:h-32" />

        {enOferta && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-rojo px-2 py-0.5 text-[10px] font-extrabold text-white">
            −{descuento}%
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

      <p className="text-xs font-semibold leading-tight">{product.name}</p>
      <p className="mt-0.5 text-[11px] text-verde/80">
        {product.unit} · {getCategoryName(product.category)}
      </p>

      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div>
          <p className="precio text-lg font-extrabold leading-none">{formatARS(product.price)}</p>
          {enOferta && (
            <p className="precio mt-0.5 text-[11px] text-verde/80 line-through">
              {formatARS(product.previousPrice!)}
            </p>
          )}
        </div>

        {!product.available ? (
          <span className="text-[11px] font-semibold text-verde/80">No disponible</span>
        ) : quantity === 0 ? (
          <button
            type="button"
            onClick={onIncrement}
            aria-label={`Agregar ${product.name} al pedido`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-verde text-white shadow-md transition-colors hover:bg-verde-dark"
          >
            <PlusIcon className="h-4 w-4" />
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
