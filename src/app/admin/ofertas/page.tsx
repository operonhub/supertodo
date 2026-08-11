'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { PromotionPicker } from '@/components/admin/PromotionPicker';
import { Badge, Toast, inputClass } from '@/components/admin/ui';
import { CopyIcon, SearchIcon } from '@/components/icons';
import { ProductImage } from '@/components/ProductImage';
import { CATEGORIES } from '@/data/categories';
import { useHydrated, useProducts } from '@/hooks/useStores';
import { formatARS } from '@/lib/currency';
import { describePromotion, getUnitPrice, hasPromotion, isActive, setPromotion } from '@/lib/products';
import { productStore } from '@/lib/stores';
import { normalizeText } from '@/lib/text';
import type { Product, Promotion } from '@/types';

export default function OfertasPage() {
  const products = useProducts();
  const hydrated = useHydrated();

  /**
   * Sólo se guardan los productos tocados, no una copia del catálogo entero.
   *
   * El borrador se **deriva** del catálogo vigente aplicándole esos cambios. Así
   * la pantalla sigue reflejando lo que pasa en el store (por ejemplo, el
   * catálogo real que aparece después de hidratar) sin necesitar ningún efecto
   * que resincronice una copia, que es de donde salen los bugs de "se me borró
   * lo que había escrito".
   */
  const [cambios, setCambios] = useState<Record<string, Product>>({});
  const [query, setQuery] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  const sucio = Object.keys(cambios).length > 0;

  const borrador = useMemo(() => products.map((p) => cambios[p.id] ?? p), [products, cambios]);

  const enOferta = useMemo(
    () => borrador.filter((p) => isActive(p) && hasPromotion(p)),
    [borrador],
  );

  /** Productos activos que pasan el buscador, agrupados por categoría. */
  const porCategoria = useMemo(() => {
    const q = normalizeText(query.trim());

    const visibles = borrador.filter((p) => {
      if (!isActive(p)) return false;
      return !q || normalizeText(p.name).includes(q);
    });

    return CATEGORIES.map((categoria) => ({
      categoria,
      productos: visibles.filter((p) => p.category === categoria.slug),
    })).filter((grupo) => grupo.productos.length > 0);
  }, [borrador, query]);

  const hayResultados = porCategoria.length > 0;

  function aplicar(id: string, promotion: Promotion | null) {
    setCambios((actuales) => {
      const base = actuales[id] ?? products.find((p) => p.id === id);
      if (!base) return actuales;
      return { ...actuales, [id]: setPromotion(base, promotion) };
    });
  }

  const publicar = () => {
    productStore.set(borrador);
    setCambios({});
    setAviso(
      `Ofertas publicadas · ${enOferta.length} ${enOferta.length === 1 ? 'producto' : 'productos'}`,
    );
  };

  const copiarLink = async () => {
    const url = `${window.location.origin}/`;
    try {
      await navigator.clipboard.writeText(url);
      setAviso('Link copiado');
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): se muestra para copiarlo a mano.
      setAviso(url);
    }
  };

  return (
    <>
      <PageHeader
        title="Ofertas"
        subtitle={`${enOferta.length} ${enOferta.length === 1 ? 'producto en oferta' : 'productos en oferta'}`}
        actions={
          <>
            <button
              type="button"
              onClick={copiarLink}
              className="flex items-center gap-2 rounded-xl border border-verde/20 bg-white px-4 py-2.5 text-sm font-bold text-verde transition-colors hover:border-verde/40"
            >
              <CopyIcon className="h-4 w-4" />
              Copiar link de la tienda
            </button>

            <button
              type="button"
              onClick={publicar}
              disabled={!sucio}
              className="rounded-xl bg-dorado px-5 py-2.5 text-sm font-extrabold text-verde-dark shadow-card transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sucio ? 'Publicar ofertas' : 'Todo publicado'}
            </button>
          </>
        }
      />

      {sucio && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-dorado/20 px-4 py-3 text-sm font-semibold text-dorado-dark"
        >
          Tenés cambios sin publicar. La tienda todavía muestra las ofertas anteriores.
        </p>
      )}

      <div className="relative mb-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-verde/70" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto…"
          aria-label="Buscar productos por nombre"
          className={`${inputClass} pl-9`}
        />
      </div>

      {!hydrated ? (
        <p className="rounded-2xl bg-white px-5 py-12 text-center text-sm text-verde/90 shadow-card">
          Cargando catálogo…
        </p>
      ) : !hayResultados ? (
        <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-card">
          <p className="font-bold">No encontramos ese producto</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 rounded-xl bg-verde px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-verde-dark"
          >
            Ver todo el catálogo
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-10">
          {porCategoria.map(({ categoria, productos }) => {
            const conOferta = productos.filter(hasPromotion).length;

            return (
              <section key={categoria.slug}>
                <h2 className="mb-2 flex items-baseline gap-2 px-1">
                  <span className="text-lg font-extrabold">{categoria.name}</span>
                  <span className="text-[11px] font-semibold text-verde/90">
                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                    {conOferta > 0 && ` · ${conOferta} en oferta`}
                  </span>
                </h2>

                <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead>
                        <tr className="border-b border-verde/10 text-left text-xs text-verde/90">
                          <th scope="col" className="px-5 py-3 font-semibold">
                            Producto
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            Precio de lista
                          </th>
                          <th scope="col" className="px-3 py-3 font-semibold">
                            Oferta
                          </th>
                          <th scope="col" className="px-5 py-3 text-right font-semibold">
                            Precio final
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((product) => {
                          const promo = product.promotion;
                          const final = getUnitPrice(product);

                          return (
                            <tr
                              key={product.id}
                              className="border-b border-verde/5 transition-colors last:border-0 hover:bg-crema/60"
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <ProductImage
                                    product={product}
                                    className="h-9 w-9 shrink-0 rounded-lg"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-semibold">{product.name}</p>
                                    <p className="text-[11px] text-verde/90">{product.unit}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="precio px-3 py-3 text-right font-semibold text-verde/90">
                                {formatARS(product.price)}
                              </td>

                              <td className="px-3 py-3">
                                <PromotionPicker
                                  product={product}
                                  onChange={(promotion) => aplicar(product.id, promotion)}
                                />
                              </td>

                              <td className="px-5 py-3 text-right">
                                {!promo ? (
                                  <span className="text-verde/90">—</span>
                                ) : promo.type === 'percent' ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="precio font-extrabold">{formatARS(final)}</span>
                                    <Badge className="bg-rojo/10 text-rojo">
                                      {describePromotion(promo)}
                                    </Badge>
                                  </div>
                                ) : (
                                  // En 3x2 y 2x1 el precio unitario no cambia: el
                                  // ahorro aparece recién en el carrito, según cuánto lleve.
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="precio font-extrabold">{formatARS(final)}</span>
                                    <Badge className="bg-dorado/25 text-dorado-dark">
                                      {describePromotion(promo)}
                                    </Badge>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}
