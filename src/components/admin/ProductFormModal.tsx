'use client';

import { useState } from 'react';
import { BarcodeScanner } from '@/components/admin/BarcodeScanner';
import { PhotoField } from '@/components/admin/PhotoField';
import { SuggestedProductsPicker } from '@/components/admin/SuggestedProductsPicker';
import { DeleteButton, Field, Modal, Toggle, inputClass, selectClass } from '@/components/admin/ui';
import { CameraIcon } from '@/components/icons';
import { CATEGORIES } from '@/data/categories';
import { lookupBarcode } from '@/lib/barcode';
import { slugify } from '@/lib/text';
import type { CategorySlug, Product } from '@/types';

/** El formulario trabaja con texto: los inputs numéricos devuelven strings. */
interface FormState {
  name: string;
  unit: string;
  category: CategorySlug;
  price: string;
  imageUrl: string;
  stock: string;
  active: boolean;
  /** Ids de las variantes sugeridas. Se editan con `SuggestedProductsPicker`. */
  suggestedProductIds: string[];
  barcode: string;
}

const VACÍO: FormState = {
  name: '',
  unit: '',
  category: 'almacen',
  price: '',
  imageUrl: '',
  stock: '',
  active: true,
  suggestedProductIds: [],
  barcode: '',
};

function toForm(product: Product): FormState {
  return {
    name: product.name,
    unit: product.unit,
    category: product.category,
    price: String(product.price),
    imageUrl: product.imageUrl ?? '',
    stock: product.stock === undefined ? '' : String(product.stock),
    active: product.active !== false,
    suggestedProductIds: product.suggestedProductIds ?? [],
    barcode: product.barcode ?? '',
  };
}

type Errores = Partial<Record<keyof FormState, string>>;

function validar(form: FormState): Errores {
  const errores: Errores = {};

  if (!form.name.trim()) errores.name = 'Poné un nombre.';
  if (!form.unit.trim()) errores.unit = 'Indicá la presentación, por ejemplo "1 kg".';

  const precio = Number(form.price);
  if (!form.price.trim() || !Number.isFinite(precio) || precio <= 0) {
    errores.price = 'El precio tiene que ser un número mayor a cero.';
  }


  if (form.stock.trim()) {
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) errores.stock = 'El stock tiene que ser 0 o más.';
  }

  return errores;
}


/**
 * El componente se monta ya con el producto a editar y se descarta al cerrar:
 * quien lo usa le pasa un `key` distinto por producto. Por eso el estado se
 * inicializa una sola vez y no hace falta ningún efecto que lo resincronice.
 */
export function ProductFormModal({
  product,
  catalog,
  onClose,
  onSave,
  onDelete,
}: {
  /** `null` = alta. */
  product: Product | null;
  /** Todo el catálogo, para elegir las variantes sugeridas de entre lo que existe. */
  catalog: Product[];
  onClose: () => void;
  /**
   * Async porque termina en una escritura a Supabase: si tira, el modal se
   * queda abierto con lo que la persona ya tipeó, en vez de cerrarse como si
   * hubiera funcionado.
   */
  onSave: (product: Product) => Promise<void>;
  /** Sólo al editar: en un alta todavía no hay nada que borrar. */
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => (product ? toForm(product) : VACÍO));
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [buscandoDatos, setBuscandoDatos] = useState(false);

  const set = <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  async function onCodigoDetectado(codigo: string) {
    setEscaneando(false);
    set('barcode', codigo);

    setBuscandoDatos(true);
    const encontrado = await lookupBarcode(codigo);
    setBuscandoDatos(false);

    if (!encontrado) return;
    setForm((f) => ({
      ...f,
      name: encontrado.name,
      unit: encontrado.unit || f.unit,
      imageUrl: encontrado.imageUrl ?? f.imageUrl,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const encontrados = validar(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const stock = form.stock.trim() ? Number(form.stock) : undefined;

    setErrorGuardado(null);
    setGuardando(true);
    try {
      await onSave({
        id: product?.id ?? slugify(form.name),
        name: form.name.trim(),
        unit: form.unit.trim(),
        category: form.category,
        // `price` es el precio de lista. Las ofertas se administran sólo desde
        // Ofertas, este formulario no las toca.
        price: Number(form.price),
        /**
         * ⚠️ No borrar: este formulario arma el producto entero y `upsertProduct`
         * reemplaza la fila completa. Sin re-adjuntar la promoción acá, editar el
         * nombre o el precio de un producto le borraría la oferta en silencio.
         */
        ...(product?.promotion ? { promotion: product.promotion } : {}),
        ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
        ...(stock !== undefined ? { stock } : {}),
        ...(form.suggestedProductIds.length > 0
          ? { suggestedProductIds: form.suggestedProductIds }
          : {}),
        ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
        active: form.active,
        // Sin control de stock el producto se asume disponible.
        available: stock === undefined ? true : stock > 0,
      });
      // Si `onSave` no tiró, el llamador cierra el modal — no hay nada más
      // que hacer acá.
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : 'No se pudo guardar. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={product ? 'Editar producto' : 'Agregar producto'}>
      <form onSubmit={submit} noValidate>
        <Field
          label="Código de barras"
          htmlFor="p-barcode"
          hint={buscandoDatos ? 'Buscando nombre y foto…' : 'Opcional. Escanealo para autocompletar'}
        >
          <div className="flex gap-2">
            <input
              id="p-barcode"
              className={inputClass}
              value={form.barcode}
              onChange={(e) => set('barcode', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setEscaneando(true)}
              aria-label="Escanear código de barras"
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-verde text-white transition-colors hover:bg-verde-dark"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
          </div>
        </Field>

        <Field label="Nombre" htmlFor="p-name" error={errores.name}>
          <input
            id="p-name"
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errores.name)}
            aria-describedby={errores.name ? 'p-name-error' : undefined}
          />
        </Field>

        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Presentación" htmlFor="p-unit" error={errores.unit} hint='Por ejemplo "900 ml" o "x4"'>
            <input
              id="p-unit"
              className={inputClass}
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              aria-invalid={Boolean(errores.unit)}
              aria-describedby={errores.unit ? 'p-unit-error' : undefined}
            />
          </Field>

          <Field label="Categoría" htmlFor="p-cat">
            <select
              id="p-cat"
              className={selectClass}
              value={form.category}
              onChange={(e) => set('category', e.target.value as CategorySlug)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Precio de lista" htmlFor="p-price" error={errores.price}>
            <input
              id="p-price"
              type="number"
              inputMode="numeric"
              min={0}
              className={inputClass}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              aria-invalid={Boolean(errores.price)}
              aria-describedby={errores.price ? 'p-price-error' : undefined}
            />
          </Field>

          <Field
            label="Stock"
            htmlFor="p-stock"
            error={errores.stock}
            hint="Opcional. Vacío = sin control de stock"
          >
            <input
              id="p-stock"
              type="number"
              inputMode="numeric"
              min={0}
              className={inputClass}
              value={form.stock}
              onChange={(e) => set('stock', e.target.value)}
              aria-invalid={Boolean(errores.stock)}
              aria-describedby={errores.stock ? 'p-stock-error' : undefined}
            />
          </Field>
        </div>

        <PhotoField value={form.imageUrl} onChange={(url) => set('imageUrl', url)} />

        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold text-verde/90">Variantes sugeridas</p>
          <p className="mb-2 text-[11px] text-verde/90">
            Hasta 2 productos que el cliente ve como opción si este no está. Aparecen
            en la ficha, no reemplazan al producto.
          </p>
          <SuggestedProductsPicker
            ownId={product?.id}
            ownName={form.name.trim() || 'este producto'}
            catalog={catalog}
            value={form.suggestedProductIds}
            onChange={(ids) => set('suggestedProductIds', ids)}
          />
        </div>

        <div className="my-4 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Activo</p>
              <p className="text-[11px] text-verde/90">Si está apagado no aparece en la tienda</p>
            </div>
            <Toggle checked={form.active} onChange={(v) => set('active', v)} label="Producto activo" />
          </div>

        </div>

        {errorGuardado && (
          <p role="alert" className="mb-3 text-sm font-semibold text-rojo">
            {errorGuardado}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-xl border border-verde/20 px-5 py-2.5 text-sm font-bold text-verde transition-colors hover:bg-verde/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>

        {/* Sólo al editar, y separado de Guardar para que no se apriete de
            paso. La foto del producto se borra junto con él, en el llamador. */}
        {product && onDelete && (
          <DeleteButton
            label="Eliminar producto"
            question={`¿Eliminar "${product.name}" del catálogo? No se puede deshacer.`}
            onDelete={onDelete}
          />
        )}
      </form>

      {escaneando && (
        <BarcodeScanner onDetected={onCodigoDetectado} onClose={() => setEscaneando(false)} />
      )}
    </Modal>
  );
}
