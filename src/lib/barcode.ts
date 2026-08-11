/**
 * Búsqueda de productos por código de barras contra Open Food Facts
 * (world.openfoodfacts.org), una base pública y sin key de productos de
 * marca. No tiene precio ni conoce las categorías de este catálogo — sólo
 * ayuda a no tipear nombre/presentación/foto a mano.
 */

export interface BarcodeLookupResult {
  name: string;
  unit: string;
  imageUrl?: string;
}

export async function lookupBarcode(code: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const producto = data.product;
    const nombre = producto.product_name?.trim();
    if (!nombre) return null;

    return {
      name: nombre,
      unit: producto.quantity?.trim() || '',
      imageUrl: producto.image_front_url || producto.image_url || undefined,
    };
  } catch {
    // Sin conexión, CORS, timeout: el formulario sigue andando, sólo sin autocompletar.
    return null;
  }
}
