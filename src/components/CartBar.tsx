'use client';

import { BasketIcon } from '@/components/icons';
import { formatARS } from '@/lib/currency';
import type { CartSummary } from '@/types';

type CartBarProps = {
  summary: CartSummary;
  onOpen: () => void;
};

/**
 * Barra fija inferior con el estado del pedido.
 *
 * Se esconde con el carrito vacío para no ocupar pantalla al pedo, y lleva
 * `pb-[env(safe-area-inset-bottom)]` para no quedar debajo de la barra de
 * gestos en los iPhone.
 */
export function CartBar({ summary, onOpen }: CartBarProps) {
  if (summary.itemCount === 0) return null;

  const productos = `${summary.itemCount} producto${summary.itemCount === 1 ? '' : 's'}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center justify-between rounded-2xl bg-verde px-4 py-3.5 text-white shadow-[0_-4px_24px_rgba(18,67,42,0.25)] transition-colors hover:bg-verde-dark"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BasketIcon className="h-4 w-4" />
            {productos} · <span className="precio font-extrabold">{formatARS(summary.total)}</span>
          </span>
          <span className="rounded-full bg-dorado px-3.5 py-1.5 text-sm font-extrabold text-verde-dark">
            Ver pedido
          </span>
        </button>
      </div>
    </div>
  );
}
