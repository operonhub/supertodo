/**
 * Formato de moneda argentino: punto para los miles y sin decimales.
 * Los precios de almacén no usan centavos, así que redondeamos.
 *
 *   formatARS(12450) → "$12.450"
 */
export function formatARS(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-AR')}`;
}

/**
 * Porcentaje de descuento derivado del par de precios.
 *
 * Se calcula en vez de guardarse para que no pueda quedar un "-20%" pegado a
 * un precio que ya cambió. Devuelve 0 si el producto no está en oferta.
 */
export function getDiscountPercent(price: number, previousPrice?: number): number {
  if (!previousPrice || previousPrice <= price) return 0;
  return Math.round(((previousPrice - price) / previousPrice) * 100);
}
