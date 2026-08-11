import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Protege `/admin/*` (menos `/admin/login`): sin sesión válida, redirige al
 * login. Corre en el Proxy —antes de que se renderice nada— para que no haya
 * ni un parpadeo de pantalla protegida.
 *
 * Se usa `getClaims()` y no `getSession()` a propósito: `getSession()` lee la
 * cookie tal cual llegó, que cualquiera puede falsear. `getClaims()` valida la
 * firma del token contra las claves públicas del proyecto en cada request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const estáProtegida = request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login';

  if (estáProtegida && !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  return response;
}
