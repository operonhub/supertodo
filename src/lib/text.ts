/**
 * Normaliza texto para buscar: minúsculas y sin acentos.
 *
 * Así "lacteos" encuentra "Lácteos" y nadie se queda sin resultados por no poner
 * la tilde, que en un buscador de almacén pasa siempre.
 *
 * El rango U+0300 a U+036F son las marcas diacríticas que `normalize('NFD')`
 * separa de la letra base.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Identificador legible a partir de un nombre: "Aceite Natura" → "aceite-natura". */
export function slugify(name: string): string {
  return (
    normalizeText(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `item-${Date.now()}`
  );
}
