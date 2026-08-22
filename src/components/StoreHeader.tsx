'use client';

import { AccountMenu } from '@/components/AccountMenu';
import { CloseIcon, SearchIcon, StarIcon } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { BUSINESS } from '@/config/business';

type StoreHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

/**
 * Header fijo: logo, reputación, cuenta y buscador.
 *
 * Queda pegado arriba porque en un catálogo largo buscar es la salida más
 * rápida, y en el celular volver al tope para tipear es justo la fricción que
 * hace abandonar el pedido.
 *
 * La cuenta va acá y no flotando sobre el catálogo: es el lugar donde se la
 * busca por costumbre, y así no compite por atención con la barra del carrito,
 * que es el único CTA que tiene que pesar en esta pantalla.
 */
export function StoreHeader({ query, onQueryChange }: StoreHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-verde px-4 pb-3 pt-4 shadow-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Logo animated className="h-12 w-auto shrink-0" />

          <div className="flex min-w-0 items-center gap-3">
            {/* La reputación sobrevive en mobile porque es la prueba social que
                sostiene el header; el lema, que repite el barrio, se va. */}
            <div className="min-w-0 text-right">
              {BUSINESS.rating && (
                <span className="flex items-center justify-end gap-1 whitespace-nowrap text-[11px] font-semibold text-white/80">
                  <StarIcon className="h-3 w-3 shrink-0 text-dorado" />
                  {BUSINESS.rating.toLocaleString('es-AR')} · {BUSINESS.address.neighborhood}
                </span>
              )}
              <span className="hidden truncate text-[11px] text-white/75 sm:block">
                {BUSINESS.tagline}
              </span>
            </div>

            <AccountMenu />
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-verde/70" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar productos…"
            aria-label="Buscar productos"
            className="w-full rounded-full bg-white/95 py-2.5 pl-10 pr-10 text-sm font-medium text-verde-dark placeholder:text-verde/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-dorado"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Borrar búsqueda"
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-verde/70 transition-colors hover:bg-verde/10"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
