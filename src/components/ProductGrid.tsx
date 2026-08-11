'use client';

import { ProductCard } from '@/components/ProductCard';
import { SearchIcon } from '@/components/icons';
import type { Product } from '@/types';

type ProductGridProps = {
  products: Product[];
  quantityOf: (productId: string) => number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  /** Lo que se buscó, para poder repetirlo en el mensaje de "sin resultados". */
  query: string;
  onClearFilters: () => void;
};

export function ProductGrid({
  products,
  quantityOf,
  onIncrement,
  onDecrement,
  query,
  onClearFilters,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-verde-soft">
          <SearchIcon className="h-5 w-5 text-verde/80" />
        </div>
        <p className="font-bold">No encontramos nada</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-verde/80">
          {query
            ? `No hay productos que coincidan con “${query}”.`
            : 'No hay productos en esta categoría.'}
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 rounded-xl bg-verde px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-verde-dark"
        >
          Ver todo el catálogo
        </button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            quantity={quantityOf(product.id)}
            onIncrement={() => onIncrement(product.id)}
            onDecrement={() => onDecrement(product.id)}
          />
        </li>
      ))}
    </ul>
  );
}
