/**
 * Búsqueda de productos por código de barras.
 *
 * Prueba primero contra Open Food Facts (world.openfoodfacts.org), la más
 * completa para productos de marca; si no encuentra nada, cae a UPCItemDB
 * como respaldo. Las dos son públicas y sin key. Ninguna tiene precio ni
 * conoce las categorías de este catálogo — sólo ayudan a no tipear
 * nombre/presentación/foto a mano.
 */

export interface BarcodeLookupResult {
  name: string;
  unit: string;
  imageUrl?: string;
}

async function lookupOpenFoodFacts(code: string): Promise<BarcodeLookupResult | null> {
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

/**
 * Respaldo cuando Open Food Facts no tiene el producto cargado (frecuente
 * con marcas chicas o muy locales). Endpoint de prueba, sin registrarse:
 * comparte límite de uso con otros usuarios de la API, así que puede fallar
 * bajo mucho tráfico ajeno — si eso empieza a pasar seguido, conviene pasar
 * a una cuenta con clave propia.
 */
async function lookupUpcItemDb(code: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    const nombre = item?.title?.trim();
    if (!nombre) return null;

    return {
      name: nombre,
      unit: item.size?.trim() || '',
      imageUrl: item.images?.[0] || undefined,
    };
  } catch {
    return null;
  }
}

export async function lookupBarcode(code: string): Promise<BarcodeLookupResult | null> {
  return (await lookupOpenFoodFacts(code)) ?? (await lookupUpcItemDb(code));
}
