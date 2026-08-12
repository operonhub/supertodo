import type { Category, CategorySlug, Subcategory } from '@/types';

/**
 * Utilidades de categorías.
 *
 * Antes esto era la lista hardcodeada del catálogo. Desde que las categorías
 * se editan en el panel viven en la configuración del comercio, así que acá
 * quedan sólo funciones puras que reciben la lista vigente. Se mantienen puras
 * —sin `useSettings()` adentro— para poder usarlas también fuera de React.
 */

/**
 * Degradé para una categoría que ya no existe.
 *
 * Nunca debería usarse, pero es la red de seguridad importante del módulo: si
 * el dueño borra una categoría y queda algún producto apuntando al slug viejo,
 * sin esto `const [from, to] = tint` haría destructuring de `undefined` y
 * tiraría abajo la grilla entera de la tienda.
 */
const TINT_POR_DEFECTO: [string, string] = ['#EFEAE0', '#DCD5C6'];

export function findCategory(categories: Category[], slug: CategorySlug): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/** Nombre visible. Cae al slug si la categoría ya no está, para no mostrar un hueco. */
export function getCategoryName(categories: Category[], slug: CategorySlug): string {
  return findCategory(categories, slug)?.name ?? slug;
}

export function getCategoryTint(categories: Category[], slug: CategorySlug): [string, string] {
  return findCategory(categories, slug)?.tint ?? TINT_POR_DEFECTO;
}

export function findSubcategory(
  categories: Category[],
  categorySlug: CategorySlug,
  subSlug: string,
): Subcategory | undefined {
  return findCategory(categories, categorySlug)?.subcategories.find((s) => s.slug === subSlug);
}

/** Nombre visible de la subcategoría, con la misma caída al slug. */
export function getSubcategoryName(
  categories: Category[],
  categorySlug: CategorySlug,
  subSlug: string,
): string {
  return findSubcategory(categories, categorySlug, subSlug)?.name ?? subSlug;
}

/**
 * Paleta que se ofrece al crear una categoría en el panel.
 *
 * Es cerrada a propósito: los seis primeros son los tonos originales del
 * catálogo, y limitar la elección evita que una categoría nueva desentone con
 * las que ya están.
 */
export const TINT_PRESETS: [string, string][] = [
  ['#FDF0D5', '#F7E0AE'],
  ['#FBE3DC', '#F5C8BC'],
  ['#E3F0FA', '#C6E0F2'],
  ['#FBE6EA', '#F3C7D0'],
  ['#E0F2F1', '#BEE3E1'],
  ['#EDE7F6', '#D6C9EC'],
  ['#E8F1EA', '#C9DFCF'],
  ['#FDF2E3', '#F5DCBC'],
];
