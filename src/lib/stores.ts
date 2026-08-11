import { BUSINESS } from '@/config/business';
import { buildSeedOrders } from '@/data/orders';
import { PRODUCTS } from '@/data/products';
import { createPersistentStore } from '@/lib/createStore';
import type { BusinessConfig, Order, Product } from '@/types';

/**
 * Los tres stores del panel.
 *
 * Cada uno arranca del mock correspondiente y guarda los cambios en
 * localStorage. Cuando exista la base de datos, lo único que cambia es de dónde
 * salen los datos: las pantallas ya leen y escriben a través de estas funciones.
 *
 * Nota honesta sobre el alcance: localStorage es por navegador. Los cambios que
 * haga el dueño en su computadora no llegan al celular de un cliente. Sirve para
 * validar el flujo con él, no como producción.
 */

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/* ================================================================
   PRODUCTOS
================================================================ */

export const productStore = createPersistentStore<Product[]>({
  /**
   * v2: el modelo de ofertas cambió de `previousPrice` a `promotion`. Subir la
   * versión descarta lo guardado con el modelo viejo, que si no se quedaría sin
   * ofertas en silencio en los navegadores que ya abrieron el panel.
   */
  key: 'supertodo.productos.v2',
  seed: PRODUCTS,
  load(stored, seed) {
    if (!Array.isArray(stored)) return seed;

    // Se valida lo mínimo para no romper la grilla con datos viejos: si algo no
    // tiene forma de producto, se descarta esa fila y no todo el catálogo.
    const productos = stored.filter(
      (p): p is Product =>
        esObjeto(p) &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.price === 'number' &&
        Number.isFinite(p.price),
    );

    return productos.length > 0 ? productos : seed;
  },
});

export function upsertProduct(product: Product) {
  productStore.update((productos) => {
    const i = productos.findIndex((p) => p.id === product.id);
    if (i === -1) return [product, ...productos];

    const copia = productos.slice();
    copia[i] = product;
    return copia;
  });
}

export function removeProduct(id: string) {
  productStore.update((productos) => productos.filter((p) => p.id !== id));
}

/* ================================================================
   PEDIDOS
================================================================ */

/**
 * El seed es `[]` y no los pedidos de muestra: las fechas de los mocks se
 * calculan con "ahora", que en el servidor sería la hora del build. Se
 * materializan en `load`, que corre sólo en el cliente.
 */
const SIN_PEDIDOS: Order[] = [];

export const orderStore = createPersistentStore<Order[]>({
  key: 'supertodo.pedidos.v1',
  load(stored) {
    if (!Array.isArray(stored)) return buildSeedOrders();

    const pedidos = stored.filter(
      (o): o is Order =>
        esObjeto(o) &&
        typeof o.id === 'string' &&
        typeof o.createdAt === 'string' &&
        Array.isArray(o.items),
    );

    return pedidos.length > 0 ? pedidos : buildSeedOrders();
  },
  seed: SIN_PEDIDOS,
});

export function updateOrder(id: string, cambios: Partial<Order>) {
  orderStore.update((pedidos) =>
    pedidos.map((pedido) => (pedido.id === id ? { ...pedido, ...cambios } : pedido)),
  );
}

/** Cambia el estado operativo y deja constancia en el historial. */
export function setOrderStatus(id: string, status: Order['status']) {
  orderStore.update((pedidos) =>
    pedidos.map((pedido) =>
      pedido.id === id
        ? {
            ...pedido,
            status,
            history: [...pedido.history, { status, at: new Date().toISOString() }],
          }
        : pedido,
    ),
  );
}

/** El pago va aparte del estado operativo: cambiarlo no toca el historial. */
export function setOrderPayment(id: string, payment: Order['payment']) {
  updateOrder(id, { payment });
}

/* ================================================================
   CONFIGURACIÓN DEL COMERCIO
================================================================ */

export const settingsStore = createPersistentStore<BusinessConfig>({
  key: 'supertodo.config.v1',
  seed: BUSINESS,
  load(stored, seed) {
    if (!esObjeto(stored)) return seed;

    // Se mezcla sobre el default: si mañana se agrega un campo nuevo a la
    // configuración, los que ya tienen algo guardado no se quedan sin él.
    return { ...seed, ...(stored as Partial<BusinessConfig>) };
  },
});

export function updateSettings(cambios: Partial<BusinessConfig>) {
  settingsStore.update((actual) => ({ ...actual, ...cambios }));
}
