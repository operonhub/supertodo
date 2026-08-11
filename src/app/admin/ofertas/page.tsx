'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge, Toast, Toggle, inputClass } from '@/components/admin/ui';
import { CopyIcon } from '@/components/icons';
import { ProductImage } from '@/components/ProductImage';
import { getCategoryName } from '@/data/categories';
import { useHydrated, useProducts, useSettings } from '@/hooks/useStores';
import { formatARS, getDiscountPercent } from '@/lib/currency';
import { isActive, isOnOffer, normalPrice, setOffer } from '@/lib/products';
import { productStore } from '@/lib/stores';
import type { Product } from '@/types';

const PUBLIC_PATH = '/';

export default function OfertasPage() {
  const products = useProducts();
  const settings = useSettings();
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
  const [aviso, setAviso] = useState<string | null>(null);

  const sucio = Object.keys(cambios).length > 0;

  const borrador = useMemo(
    () => products.map((p) => cambios[p.id] ?? p),
    [products, cambios],
  );

  const activos = useMemo(() => borrador.filter(isActive), [borrador]);
  const enOferta = useMemo(() => activos.filter(isOnOffer), [activos]);

  function actualizar(id: string, recipe: (p: Product) => Product) {
    setCambios((actuales) => {
      const base = actuales[id] ?? products.find((p) => p.id === id);
      if (!base) return actuales;
      return { ...actuales, [id]: recipe(base) };
    });
  }

  const publicar = () => {
    productStore.set(borrador);
    setCambios({});
    setAviso(`Ofertas publicadas · ${enOferta.length} ${enOferta.length === 1 ? 'producto' : 'productos'}`);
  };

  const copiarLink = async () => {
    const url = `${window.location.origin}${PUBLIC_PATH}`;
    try {
      await navigator.clipboard.writeText(url);
      setAviso('Link copiado');
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): se muestra el link para copiarlo a mano.
      setAviso(url);
    }
  };

  return (
    <>
      <PageHeader
        title="Ofertas del día"
        showDate
        subtitle={`Válidas hasta las ${settings.offerDeadline} · ${enOferta.length} en oferta`}
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
        <p role="status" className="mb-4 rounded-xl bg-dorado/20 px-4 py-3 text-sm font-semibold text-dorado-dark">
          Tenés cambios sin publicar. La tienda todavía muestra los precios anteriores.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {!hydrated ? (
          <p className="px-5 py-12 text-center text-sm text-verde/90">Cargando catálogo…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-verde/10 text-left text-xs text-verde/90">
                  <th scope="col" className="px-5 py-3.5 font-semibold">Producto</th>
                  <th scope="col" className="px-3 py-3.5 text-right font-semibold">Precio normal</th>
                  <th scope="col" className="px-3 py-3.5 text-right font-semibold">Precio oferta</th>
                  <th scope="col" className="px-3 py-3.5 text-center font-semibold">Descuento</th>
                  <th scope="col" className="px-5 py-3.5 text-center font-semibold">En oferta hoy</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((product) => {
                  const oferta = isOnOffer(product);
                  const normal = normalPrice(product);
                  const descuento = getDiscountPercent(product.price, product.previousPrice);

                  return (
                    <tr key={product.id} className="border-b border-verde/5 transition-colors last:border-0 hover:bg-crema/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage product={product} className="h-9 w-9 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-[11px] text-verde/90">
                              {product.unit} · {getCategoryName(product.category)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="precio px-3 py-3 text-right font-semibold text-verde/90">
                        {formatARS(normal)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {oferta ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={normal}
                            value={product.price}
                            aria-label={`Precio de oferta de ${product.name}`}
                            onChange={(e) =>
                              actualizar(product.id, (p) => ({ ...p, price: Number(e.target.value) }))
                            }
                            className={`${inputClass} precio w-28 text-right font-extrabold`}
                          />
                        ) : (
                          <span className="text-verde/90">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {oferta && descuento > 0 ? (
                          <Badge className="bg-rojo/10 text-rojo">−{descuento}%</Badge>
                        ) : oferta ? (
                          // Precio de oferta igual o mayor al normal: no es una oferta.
                          <Badge className="bg-amber-100 text-amber-800">Revisar</Badge>
                        ) : (
                          <span className="text-verde/90">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          <Toggle
                            checked={oferta}
                            label={`Poner ${product.name} en oferta`}
                            onChange={(next) => actualizar(product.id, (p) => setOffer(p, next))}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}
