import { setQuantity } from '@/lib/cart';
import type { CartItem } from '@/types';

/**
 * Carrito persistido en localStorage, expuesto como un store externo.
 *
 * Va por fuera de React a propósito: localStorage *es* un sistema externo, y
 * modelarlo así (en vez de con un efecto que hace setState al montar) evita
 * el render en cascada y nos deja escuchar el evento `storage`, con lo que
 * dos pestañas abiertas del catálogo comparten el mismo pedido.
 */

const STORAGE_KEY = 'supertodo.cart.v1';

/**
 * Referencia constante para el carrito vacío.
 *
 * `getSnapshot` tiene que devolver siempre la misma referencia mientras nada
 * cambie; si devolviera `[]` nuevo en cada llamada, React entraría en un
 * bucle de renders infinito.
 */
const EMPTY: CartItem[] = [];

let snapshot: CartItem[] = EMPTY;
let leído = false;
const listeners = new Set<() => void>();

/** Valida lo que sale del storage: puede estar viejo, corrupto o editado a mano. */
function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const items = parsed.filter(
      (i): i is CartItem =>
        typeof i === 'object' &&
        i !== null &&
        typeof (i as CartItem).productId === 'string' &&
        typeof (i as CartItem).quantity === 'number' &&
        Number.isFinite((i as CartItem).quantity) &&
        (i as CartItem).quantity > 0,
    );
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  snapshot = parse(window.localStorage.getItem(STORAGE_KEY));
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // La primera lectura ocurre acá, no durante el render: así el primer
  // pintado del cliente coincide con el HTML del servidor (carrito vacío) y
  // recién después aparece el pedido guardado, sin desajuste de hidratación.
  if (!leído) {
    leído = true;
    const guardado = parse(window.localStorage.getItem(STORAGE_KEY));
    if (guardado !== EMPTY) {
      snapshot = guardado;
      listener();
    }
    window.addEventListener('storage', onStorageEvent);
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): CartItem[] {
  return snapshot;
}

/** En el servidor el carrito siempre arranca vacío. */
export function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function commit(items: CartItem[]) {
  snapshot = items.length > 0 ? items : EMPTY;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Modo incógnito o storage lleno: el carrito sigue andando en memoria.
  }
  emit();
}

export function setItemQuantity(productId: string, quantity: number) {
  commit(setQuantity(snapshot, productId, quantity));
}

export function clearCart() {
  commit([]);
}
