'use client';

import { ChevronIcon } from '@/components/icons';
import type { Category, CategorySlug } from '@/types';

type CategorySidebarProps = {
  categories: Category[];
  selected: CategorySlug | null;
  onSelect: (slug: CategorySlug | null) => void;
  selectedSubcategory: string | null;
  onSelectSubcategory: (slug: string | null) => void;
  counts: Record<string, number>;
  /** Total de productos visibles, para el contador de "Todas". */
  total: number;
};

/**
 * Árbol de categorías para pantallas grandes.
 *
 * Sólo existe de `lg` para arriba: abajo de eso la navegación son los chips
 * (`CategoryChips`). Queda `sticky` porque el catálogo se hace largo y perder
 * el filtro al scrollear obliga a volver arriba cada vez.
 *
 * Sólo se despliega la categoría activa: mantener varias abiertas alarga la
 * columna sin que sirva de nada, porque filtrar es de a una.
 */
export function CategorySidebar({
  categories,
  selected,
  onSelect,
  selectedSubcategory,
  onSelectSubcategory,
  counts,
  total,
}: CategorySidebarProps) {
  const conProductos = categories.filter((c) => (counts[c.slug] ?? 0) > 0);

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav aria-label="Categorías" className="sticky top-28 pl-4">
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-verde/70">
          Categorías
        </p>

        <button
          type="button"
          aria-current={selected === null ? 'true' : undefined}
          onClick={() => onSelect(null)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
            selected === null
              ? 'bg-verde font-bold text-white'
              : 'font-semibold text-verde hover:bg-verde/10'
          }`}
        >
          Todas
          <span className={`text-[11px] ${selected === null ? 'text-white/70' : 'text-verde/60'}`}>
            {total}
          </span>
        </button>

        <ul className="mt-1 space-y-0.5">
          {conProductos.map((category) => {
            const activa = selected === category.slug;
            const tieneSubs = category.subcategories.length > 0;

            return (
              <li key={category.slug}>
                <button
                  type="button"
                  aria-current={activa ? 'true' : undefined}
                  aria-expanded={tieneSubs ? activa : undefined}
                  onClick={() => onSelect(category.slug)}
                  className={`flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    activa
                      ? 'bg-verde font-bold text-white'
                      : 'font-semibold text-verde hover:bg-verde/10'
                  }`}
                >
                  {tieneSubs ? (
                    <ChevronIcon
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${activa ? 'rotate-90' : ''}`}
                    />
                  ) : (
                    <span className="w-3.5 shrink-0" aria-hidden="true" />
                  )}

                  <span className="min-w-0 flex-1 truncate text-left">{category.name}</span>

                  <span className={`text-[11px] ${activa ? 'text-white/70' : 'text-verde/60'}`}>
                    {counts[category.slug] ?? 0}
                  </span>
                </button>

                {activa && tieneSubs && (
                  <ul className="mb-1 ml-[1.85rem] mt-0.5 space-y-0.5 border-l border-verde/15 pl-2">
                    <li>
                      <button
                        type="button"
                        aria-current={selectedSubcategory === null ? 'true' : undefined}
                        onClick={() => onSelectSubcategory(null)}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                          selectedSubcategory === null
                            ? 'font-bold text-verde-dark'
                            : 'font-medium text-verde/80 hover:bg-verde/10'
                        }`}
                      >
                        Todo
                      </button>
                    </li>

                    {category.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <button
                          type="button"
                          aria-current={selectedSubcategory === sub.slug ? 'true' : undefined}
                          onClick={() => onSelectSubcategory(sub.slug)}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                            selectedSubcategory === sub.slug
                              ? 'font-bold text-verde-dark'
                              : 'font-medium text-verde/80 hover:bg-verde/10'
                          }`}
                        >
                          {sub.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
