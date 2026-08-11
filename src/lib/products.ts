import type { Product, Promotion } from '@/types';

/** Un producto sin `active` explícito cuenta como publicado. */
export function isActive(product: Product): boolean {
  return product.active !== false;
}

export function hasPromotion(product: Product): boolean {
  return product.promotion !== undefined;
}

/**
 * Pone o saca una promoción. Pura: devuelve un producto nuevo.
 *
 * Nunca toca `price`, que es siempre el precio de lista. Es justamente lo que
 * permite prender y apagar ofertas sin perder de cuánto se partía.
 */
export function setPromotion(product: Product, promotion: Promotion | null): Product {
  if (!promotion) {
    const sinOferta = { ...product };
    delete sinOferta.promotion;
    return sinOferta;
  }
  return { ...product, promotion };
}

/**
 * Lo que sale una unidad.
 *
 * Sólo `percent` lo modifica. En 3x2 y 2x1 la unidad vale lo mismo de siempre:
 * lo que cambia es cuántas se cobran (ver `getLineSubtotal`). Por eso mostrar un
 * precio tachado en esas promos sería mentirle al cliente.
 */
export function getUnitPrice(product: Product): number {
  const promo = product.promotion;
  if (promo?.type !== 'percent' || !promo.percent) return product.price;

  return Math.round(product.price * (1 - promo.percent / 100));
}

/**
 * Cuántas unidades se pagan de un total, cuando cada N-ésima es gratis.
 *
 * 3x2 → `groupSize` 3: de cada 3 se cobran 2. Las que no llegan a completar un
 * grupo se cobran todas (con 4 unidades se pagan 3, no 2).
 */
function chargeableUnits(quantity: number, groupSize: number): number {
  return quantity - Math.floor(quantity / groupSize);
}

/**
 * Lo que se cobra por una línea del carrito. **Acá la promo se vuelve plata.**
 *
 * Asume `quantity` entero y no negativo, que es lo único que puede producir el
 * carrito; igual se blinda por si se la usa desde una vista previa del panel.
 */
export function getLineSubtotal(product: Product, quantity: number): number {
  const cantidad = Math.max(0, Math.floor(quantity));
  if (cantidad === 0) return 0;

  switch (product.promotion?.type) {
    case '3x2':
      return chargeableUnits(cantidad, 3) * product.price;
    case '2x1':
      return chargeableUnits(cantidad, 2) * product.price;
    default:
      // Sin promo o con descuento porcentual: el ahorro ya está en el unitario.
      return getUnitPrice(product) * cantidad;
  }
}

/** Etiqueta corta para badges y mensajes: "−20%", "3x2", "2x1". */
export function describePromotion(promotion: Promotion): string {
  switch (promotion.type) {
    case 'percent':
      return `−${promotion.percent ?? 0}%`;
    case '3x2':
      return '3x2';
    case '2x1':
      return '2x1';
  }
}

/** Explicación en palabras, para que el dueño vea el efecto sin interpretarlo. */
export function explainPromotion(promotion: Promotion): string {
  switch (promotion.type) {
    case 'percent':
      return `${promotion.percent ?? 0}% de descuento`;
    case '3x2':
      return 'Llevando 3, paga 2';
    case '2x1':
      return 'Llevando 2, paga 1';
  }
}

/** Deja `available` en línea con el stock declarado, para que no se desincronicen. */
export function withSyncedStock(product: Product): Product {
  if (product.stock === undefined) return product;
  return { ...product, available: product.stock > 0 };
}

/**
 * Resuelve los ids de variantes sugeridas contra el catálogo.
 *
 * `byId` conviene armarlo sólo con los productos que el cliente puede ver: así
 * una sugerencia que quedó apuntando a algo borrado o dado de baja simplemente
 * no aparece, sin necesidad de limpiar nada a mano.
 */
export function resolveSuggestions(product: Product, byId: Map<string, Product>): Product[] {
  if (!product.suggestedProductIds?.length) return [];
  return product.suggestedProductIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => p !== undefined);
}
