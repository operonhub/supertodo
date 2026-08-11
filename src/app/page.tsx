'use client';

import { useCallback, useMemo, useState } from 'react';
import { CartBar } from '@/components/CartBar';
import { CartSheet } from '@/components/CartSheet';
import { CategoryChips } from '@/components/CategoryChips';
import { OfferBanner } from '@/components/OfferBanner';
import { ProductGrid } from '@/components/ProductGrid';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreInfo } from '@/components/StoreInfo';
import { getProducts } from '@/data/products';
import { getCategoryName } from '@/data/categories';
import { useCart } from '@/hooks/useCart';
import type { CategorySlug } from '@/types';

/**
 * Normaliza para buscar: sin acentos y en minúscula, así "lacteos" encuentra
 * "Lácteos" y nadie se queda sin resultados por no poner la tilde.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function CatalogoPage() {
  const products = useMemo(() => getProducts(), []);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart(products);

  const counts = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [products]);

  const visibles = useMemo(() => {
    const q = normalize(query.trim());

    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;

      // Se busca por nombre, presentación y categoría: la gente tipea
      // "fideos", "1kg" o "limpieza" indistintamente.
      const heno = normalize(`${p.name} ${p.unit} ${getCategoryName(p.category)}`);
      return heno.includes(q);
    });
  }, [products, query, category]);

  // Estables por referencia: los consume un componente con efectos que
  // dependen de ellos, y una función nueva por render los reinstalaría.
  const limpiarFiltros = useCallback(() => {
    setQuery('');
    setCategory(null);
  }, []);

  const abrirCarrito = useCallback(() => setCartOpen(true), []);
  const cerrarCarrito = useCallback(() => setCartOpen(false), []);

  return (
    <div className="min-h-dvh pb-28">
      <StoreHeader query={query} onQueryChange={setQuery} />

      <main className="mx-auto max-w-3xl">
        <CategoryChips selected={category} onSelect={setCategory} counts={counts} />
        <OfferBanner />

        {/* Resultado de la búsqueda, anunciado a lectores de pantalla. */}
        <p className="sr-only" role="status">
          {visibles.length} productos encontrados
        </p>

        <ProductGrid
          products={visibles}
          quantityOf={cart.quantityOf}
          onIncrement={cart.increment}
          onDecrement={cart.decrement}
          query={query}
          onClearFilters={limpiarFiltros}
        />

        <StoreInfo />
      </main>

      <CartBar summary={cart.summary} onOpen={abrirCarrito} />

      <CartSheet
        open={cartOpen}
        summary={cart.summary}
        onClose={cerrarCarrito}
        onIncrement={cart.increment}
        onDecrement={cart.decrement}
        onRemove={cart.remove}
      />
    </div>
  );
}
