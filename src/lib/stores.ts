import { BUSINESS } from '@/config/business';
import { productToRow, rowToBusinessConfig, rowToOrder, rowToProduct, toJson } from '@/lib/supabase/mappers';
import { createClient } from '@/lib/supabase/client';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import type { BusinessConfig, Order, Product } from '@/types';

/**
 * Todo vive en Supabase (productos, configuración, pedidos).
 *
 * Productos y configuración no tienen tiempo real: se traen una vez al montar
 * y se actualizan a mano después de cada escritura propia. Si el dueño edita
 * un precio, un cliente que ya tenía la tienda abierta no lo ve hasta
 * refrescar.
 *
 * Los pedidos SÍ: `lib/adminRealtime.ts` conecta el canal del panel y empuja
 * los cambios por `applyRealtimeOrder`. Es la única forma de que al dueño le
 * llegue un pedido sin tener que venir a mirar, ahora que el checkout dejó de
 * abrir WhatsApp.
 */

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

/**
 * Relee el catálogo desde la base.
 *
 * La usa el checkout cuando la base rechaza un pedido por precios cambiados:
 * el carrito se recalcula solo y el cliente ve la cuenta nueva sin recargar.
 */
export function refreshProducts(): Promise<void> {
  return fetchProducts();
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
   PEDIDOS — Supabase
================================================================ */

/**
 * Left embed: los pedidos legacy sin `customer_id` siguen apareciendo y el
 * mapper cae en sus columnas denormalizadas; los nuevos suman la cuenta real.
 */
const ORDER_WITH_CUSTOMER_SELECT = `
  *,
  customer_account:customers (
    nombre,
    apellido,
    telefono,
    dni,
    direccion
  )
`;

const SIN_PEDIDOS: Order[] = [];

let orderSnapshot: Order[] = SIN_PEDIDOS;
let ordersInicializado = false;
let ordersActualizadoEn: number | null = null;
let consultaEnCurso: Promise<void> | null = null;
const orderListeners = new Set<Listener>();

function emitOrders() {
  for (const listener of orderListeners) listener();
}

/** Tira si falla: quien la llama decide si el error se muestra o se calla. */
async function fetchOrders(): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_WITH_CUSTOMER_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);

  orderSnapshot = data.map(rowToOrder);
  ordersActualizadoEn = Date.now();
  emitOrders();
}

/**
 * Vuelve a traer los pedidos desde la base.
 *
 * Si ya hay una consulta en curso devuelve esa misma en vez de largar otra:
 * el botón de actualizar y el refresco al volver a la pestaña se pueden
 * disparar casi juntos, y dos respuestas en desorden dejarían la lista con
 * los datos más viejos.
 */
export function refreshOrders(): Promise<void> {
  consultaEnCurso ??= fetchOrders().finally(() => {
    consultaEnCurso = null;
  });
  return consultaEnCurso;
}

export const orderStore = {
  subscribe(listener: Listener) {
    orderListeners.add(listener);

    if (!ordersInicializado) {
      ordersInicializado = true;
      // La carga inicial no tiene dónde mostrar el error todavía; el botón de
      // actualizar sí, y es el camino por el que se reintenta.
      refreshOrders().catch((err: Error) => console.error(err.message));
    }

    return () => {
      orderListeners.delete(listener);
    };
  },
  getSnapshot: () => orderSnapshot,
  getServerSnapshot: () => SIN_PEDIDOS,
  /** Momento de la última carga con éxito. Es un número: sirve como snapshot. */
  getUpdatedAt: () => ordersActualizadoEn,
  getServerUpdatedAt: () => null,
};

/**
 * Suma un pedido recién creado (por `createOrder`, desde el checkout) al
 * snapshot en memoria, sin ir a buscarlo de nuevo a la base.
 */
export function addOrderToSnapshot(order: Order) {
  orderSnapshot = [order, ...orderSnapshot];
  emitOrders();
}

/**
 * Mete en la lista un pedido que cambió en la base, avisado por Realtime.
 *
 * Relee la fila en vez de usar el payload del evento: `postgres_changes` manda
 * la fila cruda de `orders`, sin el embed de `customers`. Confiar en el payload
 * dejaría los pedidos nuevos sin DNI ni domicilio de la cuenta justo en el
 * detalle que el dueño abre para preparar el envío.
 *
 * Devuelve el pedido leído —o `null` si ya no está o no se pudo leer— para que
 * quien escucha decida si además hay que avisar.
 */
export async function applyRealtimeOrder(id: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_WITH_CUSTOMER_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`No se pudo leer el pedido ${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  const pedido = rowToOrder(data);
  const yaEstaba = orderSnapshot.some((p) => p.id === id);

  // Los pedidos nuevos entran ordenados y no simplemente al principio: si la
  // pestaña estuvo dormida, pueden llegar varios juntos y desordenados.
  orderSnapshot = yaEstaba
    ? orderSnapshot.map((p) => (p.id === id ? pedido : p))
    : [pedido, ...orderSnapshot].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  ordersActualizadoEn = Date.now();
  emitOrders();
  return pedido;
}

/** Saca de la lista un pedido borrado desde otra sesión del panel. */
export function dropOrderFromSnapshot(id: string) {
  if (!orderSnapshot.some((p) => p.id === id)) return;

  orderSnapshot = orderSnapshot.filter((p) => p.id !== id);
  emitOrders();
}

/** `true` si el pedido ya está en la lista: distingue un alta de un eco. */
export function knowsOrder(id: string): boolean {
  return orderSnapshot.some((p) => p.id === id);
}

async function patchOrder(id: string, cambios: TablesUpdate<'orders'>): Promise<Order> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .update(cambios)
    .eq('id', id)
    .select(ORDER_WITH_CUSTOMER_SELECT)
    .single();

  if (error) throw new Error(`No se pudo actualizar el pedido: ${error.message}`);

  const actualizado = rowToOrder(data);
  orderSnapshot = orderSnapshot.map((p) => (p.id === id ? actualizado : p));
  emitOrders();
  return actualizado;
}

export async function updateOrder(id: string, cambios: Partial<Order>): Promise<Order> {
  const fila: TablesUpdate<'orders'> = {};
  if (cambios.status !== undefined) fila.status = cambios.status;
  if (cambios.payment !== undefined) fila.payment_status = cambios.payment;
  if (cambios.notes !== undefined) fila.notes = cambios.notes;
  if (cambios.history !== undefined) fila.history = toJson(cambios.history);

  return patchOrder(id, fila);
}

/** Cambia el estado operativo y deja constancia en el historial. */
export async function setOrderStatus(id: string, status: Order['status']): Promise<Order> {
  const actual = orderSnapshot.find((p) => p.id === id);
  const history = [...(actual?.history ?? []), { status, at: new Date().toISOString() }];

  return patchOrder(id, { status, history: toJson(history) });
}

/** El pago va aparte del estado operativo: cambiarlo no toca el historial. */
export async function setOrderPayment(id: string, payment: Order['payment']): Promise<Order> {
  return patchOrder(id, { payment_status: payment });
}

/**
 * Borra el pedido de verdad, sin vuelta atrás.
 *
 * Está pensado para la basura que se junta sola: los pedidos sin confirmar
 * que nunca llegaron por WhatsApp y las pruebas. Para un pedido real que no
 * se va a entregar es mejor el estado `cancelado`, que lo deja en la
 * historia del día en vez de hacerlo desaparecer.
 */
export async function removeOrder(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('orders').delete().eq('id', id);

  if (error) throw new Error(`No se pudo borrar el pedido: ${error.message}`);

  orderSnapshot = orderSnapshot.filter((p) => p.id !== id);
  emitOrders();
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
