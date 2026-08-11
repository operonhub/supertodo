import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * En Next 16 este archivo reemplaza a `middleware.ts` (ver
 * node_modules/next/dist/docs/.../file-conventions/proxy.md — la convención
 * vieja está deprecada). La función tiene que llamarse `proxy`.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Corre en todo menos assets estáticos: si no, el proxy podría bloquear
  // CSS/JS/imágenes sin querer.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
