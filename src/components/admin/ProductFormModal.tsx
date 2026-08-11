'use client';

import { useState } from 'react';
import { Field, Modal, Toggle, inputClass, selectClass } from '@/components/admin/ui';
import { CATEGORIES } from '@/data/categories';
import { normalPrice } from '@/lib/products';
import { slugify } from '@/lib/text';
import type { CategorySlug, Product } from '@/types';

/** El formulario trabaja con texto: los inputs numéricos devuelven strings. */
interface FormState {
  name: string;
  unit: string;
  category: CategorySlug;
  price: string;
  previousPrice: string;
  imageUrl: string;
  stock: string;
  active: boolean;
  onOffer: boolean;
}

const VACÍO: FormState = {
  name: '',
  unit: '',
  category: 'almacen',
  price: '',
  previousPrice: '',
  imageUrl: '',
  stock: '',
  active: true,
  onOffer: false,
};

function toForm(product: Product): FormState {
  const enOferta = product.previousPrice !== undefined;
  return {
    name: product.name,
    unit: product.unit,
    category: product.category,
    // Con oferta activa, el campo "precio" es el precio normal y el de oferta va
    // aparte; así el dueño siempre ve el precio de lista en el mismo lugar.
    price: String(normalPrice(product)),
    previousPrice: enOferta ? String(product.price) : '',
    imageUrl: product.imageUrl ?? '',
    stock: product.stock === undefined ? '' : String(product.stock),
    active: product.active !== false,
    onOffer: enOferta,
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

  if (form.onOffer) {
    const oferta = Number(form.previousPrice);
    if (!form.previousPrice.trim() || !Number.isFinite(oferta) || oferta <= 0) {
      errores.previousPrice = 'Poné el precio con descuento.';
    } else if (Number.isFinite(precio) && oferta >= precio) {
      errores.previousPrice = 'El precio de oferta tiene que ser menor al normal.';
    }
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
  onClose,
  onSave,
}: {
  /** `null` = alta. */
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const [form, setForm] = useState<FormState>(() => (product ? toForm(product) : VACÍO));
  const [errores, setErrores] = useState<Errores>({});

  const set = <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const encontrados = validar(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const normal = Number(form.price);
    const oferta = form.onOffer ? Number(form.previousPrice) : null;
    const stock = form.stock.trim() ? Number(form.stock) : undefined;

    onSave({
      id: product?.id ?? slugify(form.name),
      name: form.name.trim(),
      unit: form.unit.trim(),
      category: form.category,
      // En el modelo `price` es el precio vigente: si hay oferta, es el rebajado.
      price: oferta ?? normal,
      ...(oferta !== null ? { previousPrice: normal } : {}),
      ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
      ...(stock !== undefined ? { stock } : {}),
      active: form.active,
      // Sin control de stock el producto se asume disponible.
      available: stock === undefined ? true : stock > 0,
    });
  }

  return (
    <Modal open onClose={onClose} title={product ? 'Editar producto' : 'Agregar producto'}>
      <form onSubmit={submit} noValidate>
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
          <Field label="Precio normal" htmlFor="p-price" error={errores.price}>
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

        <Field label="Foto (URL)" htmlFor="p-img" hint="Opcional. Si está vacío se usa el color de la categoría">
          <input
            id="p-img"
            className={inputClass}
            value={form.imageUrl}
            onChange={(e) => set('imageUrl', e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div className="my-4 space-y-3 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Activo</p>
              <p className="text-[11px] text-verde/90">Si está apagado no aparece en la tienda</p>
            </div>
            <Toggle checked={form.active} onChange={(v) => set('active', v)} label="Producto activo" />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-verde/10 pt-3">
            <div>
              <p className="text-sm font-semibold">Destacar en ofertas</p>
              <p className="text-[11px] text-verde/90">Muestra el precio tachado y el descuento</p>
            </div>
            <Toggle checked={form.onOffer} onChange={(v) => set('onOffer', v)} label="Producto en oferta" />
          </div>

          {form.onOffer && (
            <Field label="Precio de oferta" htmlFor="p-offer" error={errores.previousPrice}>
              <input
                id="p-offer"
                type="number"
                inputMode="numeric"
                min={0}
                className={inputClass}
                value={form.previousPrice}
                onChange={(e) => set('previousPrice', e.target.value)}
                aria-invalid={Boolean(errores.previousPrice)}
                aria-describedby={errores.previousPrice ? 'p-offer-error' : undefined}
              />
            </Field>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-verde-dark"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-verde/20 px-5 py-2.5 text-sm font-bold text-verde transition-colors hover:bg-verde/5"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
