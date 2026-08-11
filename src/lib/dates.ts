/**
 * Fechas en hora de Buenos Aires.
 *
 * Todo lo que el dueño lee ("Pedidos de hoy", "10:47") tiene que estar en la
 * hora del local, sin importar dónde corra el navegador o el servidor. Por eso
 * nunca se usan `getHours()` ni `toLocaleDateString()` sin zona: se formatea
 * siempre con `Intl` fijando `America/Argentina/Buenos_Aires`.
 */

export const TIMEZONE = 'America/Argentina/Buenos_Aires';

const longDate = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const shortDate = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
});

const timeOnly = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Clave de día según Buenos Aires: "2026-08-10".
 *
 * Se usa `en-CA` porque es el locale que formatea como YYYY-MM-DD, que ordena
 * alfabéticamente igual que cronológicamente.
 */
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

/**
 * "lunes 10 de agosto".
 *
 * `es-AR` devuelve "lunes, 10 de agosto"; se le saca la coma porque siempre
 * aparece a continuación de un título ("Pedidos de hoy — lunes 10 de agosto")
 * y ahí la coma sobra.
 */
export function formatLongDate(value: Date | string = new Date()): string {
  return longDate.format(toDate(value)).replace(',', '');
}

/** "10/08" */
export function formatShortDate(value: Date | string): string {
  return shortDate.format(toDate(value));
}

/** "10:47" */
export function formatTime(value: Date | string): string {
  return timeOnly.format(toDate(value));
}

/** "10/08 · 10:47" */
export function formatDateTime(value: Date | string): string {
  return `${formatShortDate(value)} · ${formatTime(value)}`;
}

export function dayKey(value: Date | string = new Date()): string {
  return dayKeyFormat.format(toDate(value));
}

/** ¿Cayó hoy, según el calendario de Buenos Aires? */
export function isToday(value: Date | string): boolean {
  return dayKey(value) === dayKey(new Date());
}

/** ¿Está dentro de los últimos N días (ventana móvil desde ahora)? */
export function isWithinDays(value: Date | string, days: number): boolean {
  const diff = Date.now() - toDate(value).getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

/** "hace 12 min", "hace 3 h", "ayer" — para las listas de pedidos. */
export function relativeTime(value: Date | string): string {
  const minutos = Math.floor((Date.now() - toDate(value).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const días = Math.floor(horas / 24);
  return días === 1 ? 'ayer' : `hace ${días} días`;
}
