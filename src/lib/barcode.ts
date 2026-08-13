/**
 * Búsqueda de productos por código de barras, en cadena por tres fuentes.
 *
 * 1. Open Food Facts: primera opción — es la única de las tres con fotos, y
 *    suele tener los productos de marca conocida.
 * 2. Precios Claros (tabla propia en Supabase, poblada por
 *    `scripts/ingest-precios-claros.mjs`): respaldo para lo que Open Food
 *    Facts no tenga cargado, sobre todo marcas chicas/locales argentinas.
 *    Nunca trae foto (esa API no la tiene), sólo nombre/presentación.
 * 3. UPCItemDB, vía `/api/barcode-lookup` (Route Handler propio): ese
 *    endpoint sólo responde CORS a su propio dominio, así que un fetch
 *    directo desde el navegador queda bloqueado en silencio — tiene que
 *    salir server-to-server.
 *
 * Ninguna tiene precio ni conoce las categorías de este catálogo — sólo
 * ayudan a no tipear nombre/presentación/foto a mano. Todas tienen timeout:
 * sin conexión, sin datos o colgada, el formulario sigue andando igual.
 */
import { createClient } from '@/lib/supabase/client';

export interface BarcodeLookupResult {
  name: string;
  unit: string;
  imageUrl?: string;
}

const TIMEOUT_MS = 4000;

async function lookupPreciosClaros(code: string): Promise<BarcodeLookupResult | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('precios_claros_productos')
    .select('nombre, presentacion')
    .eq('barcode', code)
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
    .maybeSingle();

  if (error || !data) return null;
  return { name: data.nombre, unit: data.presentacion?.trim() || '' };
}

async function lookupOpenFoodFacts(code: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
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
    return null;
  }
}

async function lookupUpcItemDb(code: string): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`/api/barcode-lookup?code=${encodeURIComponent(code)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as BarcodeLookupResult | null;
  } catch {
    return null;
  }
}

export async function lookupBarcode(code: string): Promise<BarcodeLookupResult | null> {
  return (
    (await lookupOpenFoodFacts(code)) ??
    (await lookupPreciosClaros(code)) ??
    (await lookupUpcItemDb(code))
  );
}
