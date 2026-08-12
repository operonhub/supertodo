'use client';

import { findCategory } from '@/data/categories';
import type { Category, CategorySlug } from '@/types';

type CategoryChipsProps = {
  categories: Category[];
  selected: CategorySlug | null;
  onSelect: (slug: CategorySlug | null) => void;
  selectedSubcategory: string | null;
  onSelectSubcategory: (slug: string | null) => void;
  /** Cuántos productos hay por categoría, para no ofrecer filtros vacíos. */
  counts: Record<string, number>;
};

/**
 * Navegación de categorías en celular: una fila de chips con scroll horizontal
 * y, al elegir una categoría con subcategorías, una segunda fila con ellas.
 *
 * Se oculta en `lg` porque ahí toma el relevo `CategorySidebar`, que aprovecha
 * el ancho de la pantalla grande para mostrar el árbol entero desplegado.
 */
export function CategoryChips({
  categories,
  selected,
  onSelect,
  selectedSubcategory,
  onSelectSubcategory,
  counts,
}: CategoryChipsProps) {
  const chip = (activo: boolean) =>
    `snap-start shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
      activo
        ? 'bg-verde font-bold text-white'
        : 'border border-verde/15 bg-white font-semibold text-verde hover:border-verde/40'
    }`;

  const subChip = (activo: boolean) =>
    `snap-start shrink-0 rounded-full px-3 py-1 text-[11px] transition-colors ${
      activo
        ? 'bg-verde-dark font-bold text-white'
        : 'border border-verde/15 bg-verde-soft font-semibold text-verde hover:border-verde/40'
    }`;

  const conProductos = categories.filter((c) => (counts[c.slug] ?? 0) > 0);
  const subcategorias = selected ? (findCategory(categories, selected)?.subcategories ?? []) : [];

  return (
    <div className="lg:hidden">
      <div
        role="radiogroup"
        aria-label="Filtrar por categoría"
        className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-4 py-3"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selected === null}
          onClick={() => onSelect(null)}
          className={chip(selected === null)}
        >
          Todas
        </button>

        {conProductos.map((category) => (
          <button
            key={category.slug}
            type="button"
            role="radio"
            aria-checked={selected === category.slug}
            onClick={() => onSelect(category.slug)}
            className={chip(selected === category.slug)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {subcategorias.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Filtrar por subcategoría"
          className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-4 pb-3"
        >
          <button
            type="button"
            role="radio"
            aria-checked={selectedSubcategory === null}
            onClick={() => onSelectSubcategory(null)}
            className={subChip(selectedSubcategory === null)}
          >
            Todo
          </button>

          {subcategorias.map((sub) => (
            <button
              key={sub.slug}
              type="button"
              role="radio"
              aria-checked={selectedSubcategory === sub.slug}
              onClick={() => onSelectSubcategory(sub.slug)}
              className={subChip(selectedSubcategory === sub.slug)}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
