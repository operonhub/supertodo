import { NextRequest, NextResponse } from 'next/server';
import type { BarcodeLookupResult } from '@/lib/barcode';

const TIMEOUT_MS = 4000;

/**
 * Único punto server-to-server de todo el escaneo: UPCItemDB responde
 * `Access-Control-Allow-Origin` fijado a su propio dominio, así que un fetch
 * hecho directo desde el navegador queda bloqueado por CORS. Acá no aplica.
 *
 * Endpoint de prueba, sin key ni cuenta: comparte límite de uso con otros
 * usuarios de esa API, así que puede fallar bajo mucho tráfico ajeno — para
 * las consultas ocasionales de un almacén de barrio no debería notarse.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json(null);

  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return NextResponse.json(null);

    const data = await res.json();
    const item = data.items?.[0];
    const nombre = item?.title?.trim();
    if (!nombre) return NextResponse.json(null);

    const resultado: BarcodeLookupResult = {
      name: nombre,
      unit: item.size?.trim() || '',
      imageUrl: item.images?.[0] || undefined,
    };
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json(null);
  }
}
