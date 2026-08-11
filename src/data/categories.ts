import type { Category, CategorySlug } from '@/types';

/** Orden en que aparecen los chips en la tienda. */
export const CATEGORIES: Category[] = [
  { slug: 'almacen', name: 'Almacén' },
  { slug: 'bebidas', name: 'Bebidas' },
  { slug: 'lacteos', name: 'Lácteos' },
  { slug: 'fiambreria', name: 'Fiambrería' },
  { slug: 'limpieza', name: 'Limpieza' },
  { slug: 'catering', name: 'Catering' },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategoryName(slug: CategorySlug): string {
  return BY_SLUG.get(slug)?.name ?? slug;
}

/**
 * Paleta del placeholder de cada categoría.
 *
 * Sirve para que la grilla se lea ordenada mientras no haya fotos: todos los
 * lácteos comparten el mismo azul, todo el almacén el mismo ámbar. Cuando
 * carguemos las fotos reales esto sigue siendo el fondo mientras cargan.
 */
export const CATEGORY_TINTS: Record<CategorySlug, [string, string]> = {
  almacen: ['#FDF0D5', '#F7E0AE'],
  bebidas: ['#FBE3DC', '#F5C8BC'],
  lacteos: ['#E3F0FA', '#C6E0F2'],
  fiambreria: ['#FBE6EA', '#F3C7D0'],
  limpieza: ['#E0F2F1', '#BEE3E1'],
  catering: ['#EDE7F6', '#D6C9EC'],
};
