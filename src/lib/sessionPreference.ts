/**
 * "Mantener la sesión iniciada", implementado en la app y no en la cookie.
 *
 * El camino obvio sería crear el cliente con `cookieOptions.maxAge` corto, pero
 * no funciona por dos motivos que conviene dejar escritos para no volver a
 * intentarlo:
 *
 * 1. `@supabase/ssr` arma las opciones como
 *    `{ ...DEFAULT_COOKIE_OPTIONS, ...cookieOptions, maxAge: DEFAULT.maxAge }`
 *    — pisa el `maxAge` que uno le pasa, siempre 400 días.
 * 2. `src/proxy.ts` corre en TODAS las rutas, no sólo en `/admin`. Cada request
 *    puede refrescar el token desde el servidor y reescribir la cookie con esos
 *    mismos 400 días, así que aunque se lograra acortarla, volvería a alargarse.
 *
 * En vez de pelear con eso, se deja la cookie de auth como está y se guarda
 * aparte una marca que sí muere al cerrar el navegador. Al abrir la app, si el
 * cliente había pedido no mantener la sesión y la marca ya no está, se cierra.
 *
 * La marca es una cookie de sesión y no `sessionStorage` porque `sessionStorage`
 * es por pestaña: abrir la tienda en una segunda pestaña habría parecido un
 * navegador recién abierto y habría cerrado la sesión sin motivo.
 */

const PREFERENCIA = 'supertodo.sesion-persistente';
const MARCA = 'st_sesion_abierta';

const hayNavegador = () => typeof document !== 'undefined';

function escribirMarca() {
  // Sin `max-age` ni `expires`: es exactamente lo que la hace morir al cerrar.
  const seguro = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${MARCA}=1; path=/; samesite=lax${seguro}`;
}

function borrarMarca() {
  document.cookie = `${MARCA}=; path=/; max-age=0; samesite=lax`;
}

function hayMarca(): boolean {
  return document.cookie.split('; ').some((cookie) => cookie === `${MARCA}=1`);
}

/**
 * Guarda lo que eligió el cliente al entrar.
 *
 * Mantener la sesión es el default: se guarda una marca sólo cuando pidió lo
 * contrario, así una cuenta vieja creada antes de que existiera esta opción
 * sigue comportándose como siempre.
 */
export function rememberSession(persistente: boolean) {
  if (!hayNavegador()) return;

  if (persistente) {
    localStorage.removeItem(PREFERENCIA);
    borrarMarca();
    return;
  }

  localStorage.setItem(PREFERENCIA, '0');
  escribirMarca();
}

/** `true` cuando el cliente pidió no mantener la sesión y el navegador se cerró. */
export function sessionEndedWithBrowser(): boolean {
  if (!hayNavegador()) return false;
  return localStorage.getItem(PREFERENCIA) === '0' && !hayMarca();
}

/** Se llama al cerrar sesión: la próxima entrada arranca sin preferencia previa. */
export function forgetSessionPreference() {
  if (!hayNavegador()) return;

  localStorage.removeItem(PREFERENCIA);
  borrarMarca();
}
