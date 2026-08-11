'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { Badge, Toast, inputClass, selectClass } from '@/components/admin/ui';
import { EditIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { ProductImage } from '@/components/ProductImage';
import { CATEGORIES, getCategoryName } from '@/data/categories';
import { useProducts } from '@/hooks/useStores';
import { formatARS, getDiscountPercent } from '@/lib/currency';
import { isActive, isOnOffer, normalPrice } from '@/lib/products';
import { upsertProduct } from '@/lib/stores';
import { normalizeText } from '@/lib/text';
import type { CategorySlug, Product } from '@/types';

export default function ProductosPage() {
  const products = useProducts();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategorySlug | 'todas'>('todas');
  const [editando, setEditando] = useState<Product | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const q = normalizeText(query.trim());
    return products.filter((p) => {
      if (category !== 'todas' && p.category !== category) return false;
      return !q || normalizeText(p.name).includes(q);
    });
  }, [products, query, category]);

  const abrirAlta = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdición = (product: Product) => {
    setEditando(product);
    setModalAbierto(true);
  };

  const cerrarModal = useCallback(() => setModalAbierto(false), []);

  const guardar = (product: Product) => {
    upsertProduct(product);
    setModalAbierto(false);
    setAviso(editando ? 'Producto actualizado' : 'Producto agregado');
  };

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={`${products.length} en el catálogo · ${products.filter(isActive).length} activos`}
        actions={
          <button
            type="button"
            onClick={abrirAlta}
            className="flex items-center gap-2 rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white shadow-card transition-colors hover:bg-verde-dark"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar producto
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-verde/70" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar productos por nombre"
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategorySlug | 'todas')}
          aria-label="Filtrar por categoría"
          className={`${selectClass} w-auto`}
        >
          <option value="todas">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {visibles.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-verde/90">
            No hay productos que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-verde/10 text-left text-xs text-verde/90">
                  <th scope="col" className="px-5 py-3.5 font-semibold">Producto</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold">Categoría</th>
                  <th scope="col" className="px-3 py-3.5 text-right font-semibold">Precio</th>
                  <th scope="col" className="px-3 py-3.5 text-center font-semibold">Stock</th>
                  <th scope="col" className="px-3 py-3.5 text-center font-semibold">Estado</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((product) => {
                  const enOferta = isOnOffer(product);
                  const descuento = getDiscountPercent(product.price, product.previousPrice);

                  return (
                    <tr key={product.id} className="border-b border-verde/5 transition-colors last:border-0 hover:bg-crema/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage product={product} className="h-10 w-10 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-[11px] text-verde/90">{product.unit}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-verde/90">{getCategoryName(product.category)}</td>

                      <td className="px-3 py-3 text-right">
                        <span className="precio font-extrabold">{formatARS(product.price)}</span>
                        {enOferta && (
                          <>
                            <span className="precio ml-2 text-[11px] text-verde/90 line-through">
                              {formatARS(normalPrice(product))}
                            </span>
                            <Badge className="ml-2 bg-rojo/10 text-rojo">−{descuento}%</Badge>
                          </>
                        )}
                      </td>

                      <td className="precio px-3 py-3 text-center text-verde/90">
                        {product.stock === undefined ? '—' : product.stock}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {!isActive(product) ? (
                          <Badge className="bg-gray-100 text-gray-700">Inactivo</Badge>
                        ) : product.available ? (
                          <Badge className="bg-verde-soft text-verde">Activo</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">Sin stock</Badge>
                        )}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrirEdición(product)}
                          aria-label={`Editar ${product.name}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-verde/70 transition-colors hover:bg-verde/10 hover:text-verde"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Se monta recién al abrir y con `key` por producto: así el formulario
          arranca siempre con los datos correctos, sin efectos que lo resincronicen. */}
      {modalAbierto && (
        <ProductFormModal
          key={editando?.id ?? 'nuevo'}
          product={editando}
          onClose={cerrarModal}
          onSave={guardar}
        />
      )}

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}
