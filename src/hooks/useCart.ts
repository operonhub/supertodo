'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { buildCartSummary, getQuantity } from '@/lib/cart';
import {
  clearCart,
  getServerSnapshot,
  getSnapshot,
  setItemQuantity,
  subscribe,
} from '@/lib/cartStore';
import type { Product } from '@/types';

/**
 * Acceso al carrito desde React.
 *
 * El estado real vive en `cartStore` (localStorage); acá sólo lo leemos con
 * `useSyncExternalStore`, que se encarga de la suscripción y de dar el valor
 * correcto durante el render del servidor.
 */
export function useCart(products: Product[]) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const summary = useMemo(() => buildCartSummary(items, products), [items, products]);

  const quantityOf = useCallback((productId: string) => getQuantity(items, productId), [items]);

  const increment = useCallback(
    (productId: string) => setItemQuantity(productId, getQuantity(getSnapshot(), productId) + 1),
    [],
  );

  const decrement = useCallback(
    (productId: string) => setItemQuantity(productId, getQuantity(getSnapshot(), productId) - 1),
    [],
  );

  const remove = useCallback((productId: string) => setItemQuantity(productId, 0), []);

  return {
    items,
    summary,
    quantityOf,
    increment,
    decrement,
    remove,
    setItemQuantity,
    clear: clearCart,
  };
}
