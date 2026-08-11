import { BUSINESS } from '@/config/business';
import { buildSeedOrders } from '@/data/orders';
import { createPersistentStore } from '@/lib/createStore';
import { productToRow, rowToBusinessConfig, rowToProduct, toJson } from '@/lib/supabase/mappers';
import { createClient } from '@/lib/supabase/client';
import type { BusinessConfig, Order, Product } from '@/types';

/**
 * Productos y configuración viven en Supabase; pedidos siguen en localStorage
 * (ver `orderStore` más abajo — todavía no está definido cómo entra un pedido
 * real al panel, migrarlo ahora movería datos que van a cambiar de forma).
 *
 * Sin tiempo real: cada store trae los datos una vez al montar y se
 * actualiza a mano después de cada escritura propia. Si el dueño edita un
 * precio en su computadora, un cliente que ya tenía la tienda abierta no lo
 * ve hasta refrescar.
 */

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

type Listener = () => void;

/* ================================================================
   PRODUCTOS — Supabase
================================================================ */

/**
 * Referencia estable para "antes de cargar": `getServerSnapshot` y el primer
 * pintado tienen que devolver siempre el mismo array, o `useSyncExternalStore`
 * entra en un loop de renders. Por eso no es `[]` literal en cada llamada.
 */
const SIN_PRODUCTOS: Product[] = [];

let productSnapshot: Product[] = SIN_PRODUCTOS;
let productsInicializado = false;
const productListeners = new Set<Listener>();

function emitProducts() {
  for (const listener of productListeners) listener();
}

async function fetchProducts() {
  const supabase = createClient();
  const { data, error } = await supabase.from('products').select('*').order('name');

  if (error) {
    // Sin conexión o RLS bloqueando: el catálogo sigue mostrando lo que ya
    // tenía (el mock, si es la primera carga) en vez de romper la pantalla.
    console.error('No se pudieron cargar los productos:', error.message);
    return;
  }

  productSnapshot = data.map(rowToProduct);
  emitProducts();
}

export const productStore = {
  subscribe(listener: Listener) {
    productListeners.add(listener);

    if (!productsInicializado) {
      productsInicializado = true;
      fetchProducts();
    }

    return () => {
      productListeners.delete(listener);
    };
  },
  getSnapshot: () => productSnapshot,
  // El servidor nunca tiene sesión de fetch: arranca vacío, igual que antes
  // arrancaba vacío mientras no se leía localStorage.
  getServerSnapshot: () => SIN_PRODUCTOS,
};

/** Crea o actualiza un producto. Tira si la escritura falla — nunca miente con un éxito optimista. */
export async function upsertProduct(product: Product): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .upsert(productToRow(product))
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar el producto: ${error.message}`);

  const guardado = rowToProduct(data);
  const i = productSnapshot.findIndex((p) => p.id === guardado.id);
  productSnapshot = i === -1 ? [guardado, ...productSnapshot] : productSnapshot.map((p, idx) => (idx === i ? guardado : p));
  emitProducts();
}

/**
 * Guarda varios productos de una sola vez (la tanda de ofertas del día).
 * Un solo `upsert` con un array es una sola ida y vuelta a la base, no una
 * por producto.
 */
export async function upsertProducts(products: Product[]): Promise<void> {
  if (products.length === 0) return;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .upsert(products.map(productToRow))
    .select();

  if (error) throw new Error(`No se pudieron guardar las ofertas: ${error.message}`);

  const guardados = new Map(data.map((row) => [row.id, rowToProduct(row)]));
  productSnapshot = productSnapshot.map((p) => guardados.get(p.id) ?? p);
  emitProducts();
}

export async function removeProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) throw new Error(`No se pudo borrar el producto: ${error.message}`);

  productSnapshot = productSnapshot.filter((p) => p.id !== id);
  emitProducts();
}

/* ================================================================
   PEDIDOS — localStorage, sin cambios
   (fuera de alcance de esta migración: ver nota arriba)
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
   CONFIGURACIÓN DEL COMERCIO — Supabase, fila única
================================================================ */

let settingsSnapshot: BusinessConfig = BUSINESS;
let settingsInicializado = false;
const settingsListeners = new Set<Listener>();

function emitSettings() {
  for (const listener of settingsListeners) listener();
}

async function fetchSettings() {
  const supabase = createClient();
  const { data, error } = await supabase.from('business_config').select('data').eq('id', 1).maybeSingle();

  if (error || !data) {
    console.error('No se pudo cargar la configuración:', error?.message ?? 'fila vacía');
    return;
  }

  settingsSnapshot = rowToBusinessConfig(data.data, BUSINESS);
  emitSettings();
}

export const settingsStore = {
  subscribe(listener: Listener) {
    settingsListeners.add(listener);

    if (!settingsInicializado) {
      settingsInicializado = true;
      fetchSettings();
    }

    return () => {
      settingsListeners.delete(listener);
    };
  },
  getSnapshot: () => settingsSnapshot,
  // Mismo valor que el seed original: el HTML del servidor se arma con la
  // config por defecto, igual que antes con localStorage.
  getServerSnapshot: () => BUSINESS,
};

export async function updateSettings(cambios: Partial<BusinessConfig>): Promise<void> {
  const próxima = { ...settingsSnapshot, ...cambios };

  const supabase = createClient();
  const { error } = await supabase
    .from('business_config')
    .update({ data: toJson(próxima), updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) throw new Error(`No se pudo guardar la configuración: ${error.message}`);

  settingsSnapshot = próxima;
  emitSettings();
}
