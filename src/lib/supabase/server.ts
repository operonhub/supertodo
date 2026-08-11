import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cliente de Supabase para Server Components, Route Handlers y Server Actions.
 *
 * No se usa todavía en esta etapa (el panel es 100% componentes de cliente),
 * pero es la pieza estándar de `@supabase/ssr` para cuando haga falta —
 * queda lista en vez de tener que redescubrir el patrón de cookies después.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: no puede escribir cookies.
            // Se ignora porque el proxy ya se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
