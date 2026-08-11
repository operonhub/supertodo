'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { Badge, Toast, inputClass, selectClass } from '@/components/admin/ui';
import { EditIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { ProductImage } from '@/components/ProductImage';
import { CATEGORIES, getCategoryName } from '@/data/categories';
import { useProducts } from '@/hooks/useStores';
import { formatARS } from '@/lib/currency';
import { describePromotion, getUnitPrice, isActive } from '@/lib/products';
import { upsertProduct } from '@/lib/stores';
import { normalizeText } from '@/lib/text';
import type { CategorySlug, Product } from '@/types';

/** Activo/Inactivo/Sin stock — la misma lógica la usan la tabla y las tarjetas. */
function EstadoBadge({ product }: { product: Product }) {
  if (!isActive(product)) return <Badge className="bg-gray-100 text-gray-700">Inactivo</Badge>;
  if (product.available) return <Badge className="bg-verde-soft text-verde">Activo</Badge>;
  return <Badge className="bg-amber-100 text-amber-800">Sin stock</Badge>;
}

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

      {visibles.length === 0 ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <p className="px-5 py-12 text-center text-sm text-verde/90">
            No hay productos que coincidan con la búsqueda.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla en escritorio */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card lg:block">
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
                    const promo = product.promotion;
                    const final = getUnitPrice(product);

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

                        {/* Las ofertas se administran en la pantalla Ofertas: acá
                            sólo se muestran, para no tener dos lugares donde tocarlas. */}
                        <td className="px-3 py-3 text-right">
                          <span className="precio font-extrabold">{formatARS(final)}</span>
                          {promo && (
                            <>
                              {final < product.price && (
                                <span className="precio ml-2 text-[11px] text-verde/90 line-through">
                                  {formatARS(product.price)}
                                </span>
                              )}
                              <Badge
                                className={`ml-2 ${
                                  promo.type === 'percent'
                                    ? 'bg-rojo/10 text-rojo'
                                    : 'bg-dorado/25 text-dorado-dark'
                                }`}
                              >
                                {describePromotion(promo)}
                              </Badge>
                            </>
                          )}
                        </td>

                        <td className="precio px-3 py-3 text-center text-verde/90">
                          {product.stock === undefined ? '—' : product.stock}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <EstadoBadge product={product} />
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
          </div>

          {/* Tarjetas en mobile */}
          <ul className="space-y-3 lg:hidden">
            {visibles.map((product) => {
              const promo = product.promotion;
              const final = getUnitPrice(product);

              return (
                <li key={product.id} className="rounded-2xl bg-white p-4 shadow-card">
                  <div className="mb-3 flex items-center gap-3">
                    <ProductImage product={product} className="h-12 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{product.name}</p>
                      <p className="text-[11px] text-verde/90">
                        {product.unit} · {getCategoryName(product.category)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="precio text-lg font-extrabold">{formatARS(final)}</p>
                      {promo && final < product.price && (
                        <p className="precio text-[11px] text-verde/90 line-through">
                          {formatARS(product.price)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {promo && (
                      <Badge
                        className={
                          promo.type === 'percent'
                            ? 'bg-rojo/10 text-rojo'
                            : 'bg-dorado/25 text-dorado-dark'
                        }
                      >
                        {describePromotion(promo)}
                      </Badge>
                    )}
                    <EstadoBadge product={product} />
                    {product.stock !== undefined && (
                      <Badge className="bg-verde/10 text-verde">Stock: {product.stock}</Badge>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirEdición(product)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-verde/20 px-3 py-2 text-xs font-bold text-verde transition-colors hover:bg-verde/5"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Editar producto
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Se monta recién al abrir y con `key` por producto: así el formulario
          arranca siempre con los datos correctos, sin efectos que lo resincronicen. */}
      {modalAbierto && (
        <ProductFormModal
          key={editando?.id ?? 'nuevo'}
          product={editando}
          catalog={products}
          onClose={cerrarModal}
          onSave={guardar}
        />
      )}

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}
