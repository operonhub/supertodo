import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Protege `/admin/*` (menos `/admin/login`): exige sesión válida Y pertenecer
 * a `public.admins`. Un cliente también es `authenticated`, por eso comprobar
 * solamente la sesión abriría todo el panel a cualquier comprador registrado.
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

  if (estáProtegida) {
    if (!data?.claims) return redirectToLogin(request, response);

    // El RPC corre con el JWT de la request y consulta la allowlist sin
    // exponerla. Ante un error se falla cerrado: nunca se deja pasar por no
    // haber podido comprobar el rol.
    const { data: isAdmin, error } = await supabase.rpc('is_admin');
    if (error || !isAdmin) return redirectToLogin(request, response);
  }

  return response;
}

function redirectToLogin(request: NextRequest, sessionResponse: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';

  const redirect = NextResponse.redirect(url);
  // Si `getClaims()` refrescó cookies, el redirect también tiene que enviarlas
  // al navegador; devolver una respuesta nueva sin copiarlas perdería el refresh.
  sessionResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
