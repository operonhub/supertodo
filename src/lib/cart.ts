import { getLineSubtotal } from '@/lib/products';
import type { CartItem, CartSummary, Product } from '@/types';

/**
 * Resuelve los ítems guardados contra el catálogo actual.
 *
 * Descarta en silencio los productos que ya no existen o que quedaron sin
 * stock: el carrito vive en localStorage y puede sobrevivir a un cambio de
 * catálogo, así que nunca hay que asumir que un id guardado sigue siendo
 * válido.
 */
export function buildCartSummary(items: CartItem[], products: Product[]): CartSummary {
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = items.flatMap((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.available || item.quantity <= 0) return [];
    // El subtotal sale de `getLineSubtotal` y no de `price * cantidad`: es el
    // único lugar donde las promos por cantidad (3x2, 2x1) descuentan de verdad.
    return [
      { product, quantity: item.quantity, subtotal: getLineSubtotal(product, item.quantity) },
    ];
  });

  return {
    lines,
    itemCount: lines.length,
    unitCount: lines.reduce((n, l) => n + l.quantity, 0),
    total: lines.reduce((n, l) => n + l.subtotal, 0),
  };
}

/** Cantidad de un producto puntual, 0 si no está en el carrito. */
export function getQuantity(items: CartItem[], productId: string): number {
  return items.find((i) => i.productId === productId)?.quantity ?? 0;
}

/**
 * Devuelve una lista nueva con la cantidad puesta en `quantity`.
 * Con 0 o menos, saca el producto. Nunca muta la lista original.
 */
export function setQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity <= 0) return items.filter((i) => i.productId !== productId);

  const exists = items.some((i) => i.productId === productId);
  if (exists) {
    return items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
  }
  return [...items, { productId, quantity }];
}
