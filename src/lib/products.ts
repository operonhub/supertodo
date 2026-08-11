import type { Product } from '@/types';

/** Un producto sin `active` explícito cuenta como publicado. */
export function isActive(product: Product): boolean {
  return product.active !== false;
}

/** ¿Está en oferta? Se deduce del par de precios, nunca de un flag aparte. */
export function isOnOffer(product: Product): boolean {
  return product.previousPrice !== undefined && product.previousPrice > product.price;
}

/**
 * Precio de lista, esté o no en oferta.
 *
 * Cuando hay oferta, `price` es el precio rebajado y `previousPrice` el normal;
 * fuera de oferta, el normal es `price`. Esta función evita repetir ese `??`
 * en cada pantalla del panel.
 */
export function normalPrice(product: Product): number {
  return product.previousPrice ?? product.price;
}

/**
 * Pone o saca un producto de las ofertas del día.
 *
 * El modelo guarda el precio vigente en `price` y el tachado en `previousPrice`,
 * así que activar una oferta es correr el precio normal a `previousPrice`, y
 * desactivarla es devolverlo a su lugar. Concentrarlo acá evita que cada
 * pantalla invente su propia versión y termine con precios cruzados.
 */
export function setOffer(product: Product, enabled: boolean, offerPrice?: number): Product {
  const normal = normalPrice(product);

  if (!enabled) {
    // Se saca `previousPrice` en vez de dejarlo en undefined: así el objeto que
    // se guarda no arrastra la clave y `isOnOffer` no tiene que contemplarla.
    const sinOferta = { ...product, price: normal };
    delete sinOferta.previousPrice;
    return sinOferta;
  }

  // Sin precio propuesto se arranca con un 10% de descuento, redondeado a
  // decenas: es un punto de partida razonable que el dueño después ajusta.
  const propuesto = offerPrice ?? Math.round((normal * 0.9) / 10) * 10;

  return { ...product, price: propuesto, previousPrice: normal };
}

/** Deja `available` en línea con el stock declarado, para que no se desincronicen. */
export function withSyncedStock(product: Product): Product {
  if (product.stock === undefined) return product;
  return { ...product, available: product.stock > 0 };
}
