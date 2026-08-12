'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DeleteButton, Toast, inputClass, selectClass } from '@/components/admin/ui';
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon, PlusIcon } from '@/components/icons';
import { TINT_PRESETS } from '@/data/categories';
import { useProducts, useSettings } from '@/hooks/useStores';
import { updateSettings, upsertProducts } from '@/lib/stores';
import { slugify } from '@/lib/text';
import type { Category } from '@/types';

/** Mueve un elemento del array sin mutar el original. `null` si el movimiento no aplica. */
function mover<T>(items: T[], desde: number, delta: number): T[] | null {
  const hasta = desde + delta;
  if (hasta < 0 || hasta >= items.length) return null;

  const copia = items.slice();
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia;
}

/**
 * Genera un slug que no choque con los que ya están.
 *
 * El slug es el id que guardan los productos, así que dos categorías con el
 * mismo slug harían que los productos de una aparezcan en la otra.
 */
function slugÚnico(nombre: string, tomados: string[]): string {
  const base = slugify(nombre);
  if (!tomados.includes(base)) return base;

  let n = 2;
  while (tomados.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export default function CategoriasPage() {
  const settings = useSettings();
  const products = useProducts();

  /**
   * Se edita sobre un borrador y se guarda todo junto, igual que Configuración.
   * En `null` no hay cambios sin guardar y la lista se lee de la config vigente.
   */
  const [borrador, setBorrador] = useState<Category[] | null>(null);

  /**
   * Categorías borradas que tenían productos, y a dónde van esos productos.
   * `slug borrado → slug destino`. Se aplica recién al guardar, para que nada
   * se mueva si la persona se arrepiente y recarga.
   */
  const [reasignaciones, setReasignaciones] = useState<Record<string, string>>({});

  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const categorias = borrador ?? settings.categories;
  const sucio = borrador !== null;

  /** Cuántos productos tiene cada categoría, contra el catálogo real. */
  const conteo = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [products]);

  const editar = (siguiente: Category[]) => setBorrador(siguiente);

  const parchar = (i: number, cambios: Partial<Category>) =>
    editar(categorias.map((c, j) => (j === i ? { ...c, ...cambios } : c)));

  function agregarCategoria() {
    const slug = slugÚnico('categoria', categorias.map((c) => c.slug));
    editar([
      ...categorias,
      {
        slug,
        name: '',
        tint: TINT_PRESETS[categorias.length % TINT_PRESETS.length],
        subcategories: [],
      },
    ]);
    setAbierta(slug);
  }

  function agregarSubcategoria(i: number) {
    const categoria = categorias[i];
    const slug = slugÚnico('subcategoria', categoria.subcategories.map((s) => s.slug));
    parchar(i, { subcategories: [...categoria.subcategories, { slug, name: '' }] });
  }

  async function borrarCategoria(i: number, destino: string) {
    const categoria = categorias[i];
    if (conteo[categoria.slug]) {
      setReasignaciones((r) => ({ ...r, [categoria.slug]: destino }));
    }
    editar(categorias.filter((_, j) => j !== i));
  }

  async function guardar() {
    // Nombre vacío = categoría a medio crear. Se frena acá y no en la base:
    // una categoría sin nombre se ve como un hueco en la tienda.
    const sinNombre = categorias.find((c) => !c.name.trim());
    if (sinNombre) {
      setAviso('Hay una categoría sin nombre.');
      return;
    }

    const subSinNombre = categorias.find((c) => c.subcategories.some((s) => !s.name.trim()));
    if (subSinNombre) {
      setAviso(`Hay una subcategoría sin nombre en "${subSinNombre.name}".`);
      return;
    }

    setGuardando(true);
    try {
      // Primero se mueven los productos y después se guardan las categorías:
      // al revés, un fallo a mitad de camino dejaría productos apuntando a una
      // categoría que ya no existe.
      const aMover = products
        .filter((p) => reasignaciones[p.category])
        .map((p) => ({
          ...p,
          category: reasignaciones[p.category],
          // La subcategoría vieja no existe en el destino.
          subcategory: undefined,
        }));

      if (aMover.length > 0) await upsertProducts(aMover);
      await updateSettings({ categories: categorias });

      setBorrador(null);
      setReasignaciones({});
      setAviso(
        aMover.length > 0
          ? `Categorías guardadas · ${aMover.length} ${aMover.length === 1 ? 'producto movido' : 'productos movidos'}`
          : 'Categorías guardadas',
      );
    } catch (err) {
      // El borrador queda intacto: no se pierde nada de lo editado.
      setAviso(err instanceof Error ? err.message : 'No se pudieron guardar las categorías.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        subtitle="Cómo se agrupa el catálogo en la tienda"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={agregarCategoria}
              className="flex items-center gap-2 rounded-xl border border-verde/20 bg-white px-4 py-2.5 text-sm font-bold text-verde shadow-card transition-colors hover:bg-verde/5"
            >
              <PlusIcon className="h-4 w-4" />
              Agregar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={!sucio || guardando}
              className="rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white shadow-card transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : sucio ? 'Guardar cambios' : 'Todo guardado'}
            </button>
          </div>
        }
      />

      {sucio && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Tenés cambios sin guardar.
          {Object.keys(reasignaciones).length > 0 &&
            ' Al guardar se van a mover los productos de las categorías que borraste.'}
        </p>
      )}

      <ul className="space-y-3 pb-10">
        {categorias.map((categoria, i) => {
          const productos = conteo[categoria.slug] ?? 0;
          const expandida = abierta === categoria.slug;
          const otras = categorias.filter((c) => c.slug !== categoria.slug);

          return (
            <li key={categoria.slug} className="rounded-2xl bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Subir ${categoria.name || 'la categoría'}`}
                    disabled={i === 0}
                    onClick={() => {
                      const siguiente = mover(categorias, i, -1);
                      if (siguiente) editar(siguiente);
                    }}
                    className="rounded p-0.5 text-verde/70 transition-colors hover:bg-verde/10 disabled:opacity-25"
                  >
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${categoria.name || 'la categoría'}`}
                    disabled={i === categorias.length - 1}
                    onClick={() => {
                      const siguiente = mover(categorias, i, 1);
                      if (siguiente) editar(siguiente);
                    }}
                    className="rounded p-0.5 text-verde/70 transition-colors hover:bg-verde/10 disabled:opacity-25"
                  >
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span
                  aria-hidden="true"
                  className="h-9 w-9 shrink-0 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${categoria.tint[0]}, ${categoria.tint[1]})`,
                  }}
                />

                <input
                  aria-label="Nombre de la categoría"
                  placeholder="Nombre de la categoría"
                  className={`${inputClass} min-w-40 flex-1`}
                  value={categoria.name}
                  onChange={(e) => parchar(i, { name: e.target.value })}
                />

                <span className="shrink-0 text-[11px] text-verde/90">
                  {productos} {productos === 1 ? 'producto' : 'productos'}
                </span>

                <button
                  type="button"
                  aria-expanded={expandida}
                  onClick={() => setAbierta(expandida ? null : categoria.slug)}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-verde transition-colors hover:bg-verde/10"
                >
                  <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${expandida ? 'rotate-90' : ''}`} />
                  {categoria.subcategories.length > 0
                    ? `${categoria.subcategories.length} subcat.`
                    : 'Subcategorías'}
                </button>
              </div>

              {expandida && (
                <div className="mt-4 border-t border-verde/10 pt-4">
                  <p className="mb-2 text-xs font-semibold text-verde/90">Color en la tienda</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {TINT_PRESETS.map((tint) => {
                      const elegido = categoria.tint[0] === tint[0] && categoria.tint[1] === tint[1];
                      return (
                        <button
                          key={tint.join()}
                          type="button"
                          aria-label={`Usar este color`}
                          aria-pressed={elegido}
                          onClick={() => parchar(i, { tint })}
                          className={`h-8 w-8 rounded-lg transition ${
                            elegido ? 'ring-2 ring-verde ring-offset-2' : 'hover:scale-105'
                          }`}
                          style={{ background: `linear-gradient(135deg, ${tint[0]}, ${tint[1]})` }}
                        />
                      );
                    })}
                  </div>

                  <p className="mb-2 text-xs font-semibold text-verde/90">Subcategorías</p>

                  {categoria.subcategories.length === 0 ? (
                    <p className="mb-2 text-[11px] text-verde/90">
                      Sin subcategorías. Los productos de esta categoría se muestran todos juntos.
                    </p>
                  ) : (
                    <ul className="mb-2 space-y-2">
                      {categoria.subcategories.map((sub, j) => (
                        <li key={sub.slug} className="flex items-center gap-2">
                          <div className="flex shrink-0 flex-col">
                            <button
                              type="button"
                              aria-label={`Subir ${sub.name || 'la subcategoría'}`}
                              disabled={j === 0}
                              onClick={() => {
                                const siguiente = mover(categoria.subcategories, j, -1);
                                if (siguiente) parchar(i, { subcategories: siguiente });
                              }}
                              className="rounded p-0.5 text-verde/70 transition-colors hover:bg-verde/10 disabled:opacity-25"
                            >
                              <ArrowUpIcon className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Bajar ${sub.name || 'la subcategoría'}`}
                              disabled={j === categoria.subcategories.length - 1}
                              onClick={() => {
                                const siguiente = mover(categoria.subcategories, j, 1);
                                if (siguiente) parchar(i, { subcategories: siguiente });
                              }}
                              className="rounded p-0.5 text-verde/70 transition-colors hover:bg-verde/10 disabled:opacity-25"
                            >
                              <ArrowDownIcon className="h-3 w-3" />
                            </button>
                          </div>

                          <input
                            aria-label="Nombre de la subcategoría"
                            placeholder="Nombre de la subcategoría"
                            className={`${inputClass} flex-1`}
                            value={sub.name}
                            onChange={(e) =>
                              parchar(i, {
                                subcategories: categoria.subcategories.map((s, k) =>
                                  k === j ? { ...s, name: e.target.value } : s,
                                ),
                              })
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              parchar(i, {
                                subcategories: categoria.subcategories.filter((_, k) => k !== j),
                              })
                            }
                            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-rojo transition-colors hover:bg-rojo/10"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => agregarSubcategoria(i)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-verde transition-colors hover:bg-verde/10"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Agregar subcategoría
                  </button>

                  <BorrarCategoria
                    categoria={categoria}
                    productos={productos}
                    otras={otras}
                    onBorrar={(destino) => borrarCategoria(i, destino)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </>
  );
}

/**
 * Borrado de una categoría.
 *
 * Si tiene productos no se bloquea el borrado: se pide a qué categoría pasan.
 * Bloquearlo dejaría el botón inútil para siempre en cuanto haya un producto
 * cargado, y borrar sin mover dejaría productos apuntando a la nada.
 */
function BorrarCategoria({
  categoria,
  productos,
  otras,
  onBorrar,
}: {
  categoria: Category;
  productos: number;
  otras: Category[];
  onBorrar: (destino: string) => void;
}) {
  const [destino, setDestino] = useState(otras[0]?.slug ?? '');

  if (otras.length === 0) {
    return (
      <p className="mt-4 border-t border-verde/10 pt-4 text-[11px] text-verde/90">
        No se puede borrar la única categoría: el catálogo necesita al menos una.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-verde/10 pt-4">
      {productos > 0 && (
        <div className="mb-2">
          <label
            htmlFor={`destino-${categoria.slug}`}
            className="mb-1 block text-xs font-semibold text-verde/90"
          >
            Si la borrás, sus {productos} {productos === 1 ? 'producto pasa' : 'productos pasan'} a
          </label>
          <select
            id={`destino-${categoria.slug}`}
            className={selectClass}
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            {otras.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name || c.slug}
              </option>
            ))}
          </select>
        </div>
      )}

      <DeleteButton
        label="Eliminar categoría"
        question={
          productos > 0
            ? `¿Eliminar "${categoria.name}" y mover sus ${productos} productos? Se aplica al guardar.`
            : `¿Eliminar "${categoria.name}"? Se aplica al guardar.`
        }
        onDelete={async () => onBorrar(destino)}
      />
    </div>
  );
}
