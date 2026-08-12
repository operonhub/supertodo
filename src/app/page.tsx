'use client';

import { useCallback, useMemo, useState } from 'react';
import { CartBar } from '@/components/CartBar';
import { CartSheet } from '@/components/CartSheet';
import { CategoryChips } from '@/components/CategoryChips';
import { CategorySidebar } from '@/components/CategorySidebar';
import { OfferBanner } from '@/components/OfferBanner';
import { ProductGrid } from '@/components/ProductGrid';
import { StoreHeader } from '@/components/StoreHeader';
import { StoreInfo } from '@/components/StoreInfo';
import { getCategoryName } from '@/data/categories';
import { useCart } from '@/hooks/useCart';
import { useProducts, useSettings } from '@/hooks/useStores';
import { isActive } from '@/lib/products';
import { normalizeText } from '@/lib/text';
import type { CategorySlug } from '@/types';

export default function CatalogoPage() {
  // Los productos salen del store, no del mock directo: así lo que el dueño
  // edita en el panel se ve acá. El valor del servidor sigue siendo el catálogo
  // estático, con lo que el HTML prerenderizado no cambia.
  const todos = useProducts();
  const settings = useSettings();

  // Un producto inactivo no existe para el cliente: ni se muestra ni se busca.
  const products = useMemo(() => todos.filter(isActive), [todos]);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart(products);

  const counts = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [products]);

  // Índice del catálogo visible, para que cada card resuelva sus variantes
  // sugeridas. Se arma sólo con los activos: una sugerencia a algo dado de baja
  // se cae sola y nunca se le muestra al cliente.
  const catalogById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const visibles = useMemo(() => {
    const q = normalizeText(query.trim());

    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      if (!q) return true;

      // Se busca por nombre, presentación y categoría: la gente tipea
      // "fideos", "1kg" o "limpieza" indistintamente.
      const heno = normalizeText(
        `${p.name} ${p.unit} ${getCategoryName(settings.categories, p.category)}`,
      );
      return heno.includes(q);
    });
  }, [products, query, category, subcategory, settings.categories]);

  // Estables por referencia: los consume un componente con efectos que
  // dependen de ellos, y una función nueva por render los reinstalaría.
  const limpiarFiltros = useCallback(() => {
    setQuery('');
    setCategory(null);
    setSubcategory(null);
  }, []);

  /** Cambiar de categoría siempre limpia la subcategoría: la de antes no existe acá. */
  const elegirCategoria = useCallback((slug: CategorySlug | null) => {
    setCategory(slug);
    setSubcategory(null);
  }, []);

  const abrirCarrito = useCallback(() => setCartOpen(true), []);
  const cerrarCarrito = useCallback(() => setCartOpen(false), []);

  return (
    <div className="min-h-dvh pb-28">
      <StoreHeader query={query} onQueryChange={setQuery} />

      <div className="mx-auto max-w-7xl">
        <CategoryChips
          categories={settings.categories}
          selected={category}
          onSelect={elegirCategoria}
          selectedSubcategory={subcategory}
          onSelectSubcategory={setSubcategory}
          counts={counts}
        />

        {/* Arriba de las dos columnas: es un aviso de toda la tienda, no algo
            de la grilla, y al costado de la barra lateral se leería como si
            aplicara sólo a la categoría abierta. */}
        <OfferBanner />

        <div className="flex">
          <CategorySidebar
            categories={settings.categories}
            selected={category}
            onSelect={elegirCategoria}
            selectedSubcategory={subcategory}
            onSelectSubcategory={setSubcategory}
            counts={counts}
            total={products.length}
          />

          <main className="min-w-0 flex-1">
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
              catalogById={catalogById}
            />
          </main>
        </div>
      </div>

      {/* Fuera del contenedor a propósito: su fondo va de borde a borde. */}
      <StoreInfo />

      <CartBar summary={cart.summary} onOpen={abrirCarrito} />

      <CartSheet
        open={cartOpen}
        summary={cart.summary}
        onClose={cerrarCarrito}
        onIncrement={cart.increment}
        onDecrement={cart.decrement}
        onRemove={cart.remove}
        onOrderSent={cart.clear}
      />
    </div>
  );
}
