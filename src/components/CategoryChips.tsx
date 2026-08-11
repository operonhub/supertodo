'use client';

import { CATEGORIES } from '@/data/categories';
import type { CategorySlug } from '@/types';

type CategoryChipsProps = {
  selected: CategorySlug | null;
  onSelect: (slug: CategorySlug | null) => void;
  /** Cuántos productos hay por categoría, para no ofrecer filtros vacíos. */
  counts: Record<string, number>;
};

/**
 * Filtro de categorías en scroll horizontal.
 *
 * Es un grupo de radio: hay exactamente una categoría activa, y "Todas"
 * (null) es el estado por defecto.
 */
export function CategoryChips({ selected, onSelect, counts }: CategoryChipsProps) {
  const chip = (activo: boolean) =>
    `snap-start shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
      activo
        ? 'bg-verde font-bold text-white'
        : 'border border-verde/15 bg-white font-semibold text-verde hover:border-verde/40'
    }`;

  return (
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

      {CATEGORIES.filter((c) => (counts[c.slug] ?? 0) > 0).map((category) => (
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
  );
}
