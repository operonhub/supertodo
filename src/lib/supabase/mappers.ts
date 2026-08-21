import type { Json, Tables, TablesInsert } from '@/lib/supabase/database.types';
import type { BusinessConfig, Order, OrderEvent, OrderItem, Product, Promotion } from '@/types';

type ProductRow = Tables<'products'>;
type ProductInsert = TablesInsert<'products'>;
type OrderRow = Tables<'orders'>;
type OrderInsert = TablesInsert<'orders'>;
type CustomerAccountRow = Pick<
  Tables<'customers'>,
  'nombre' | 'apellido' | 'telefono' | 'dni' | 'direccion'
>;

/** Resultado del embed `customer_account:customers(...)` usado por el store. */
export type OrderWithCustomerRow = OrderRow & {
  customer_account: CustomerAccountRow | null;
};

/**
 * El tipo `Json` generado exige index signature en cada objeto anidado, algo
 * que nuestros tipos de dominio (`Promotion`, `BusinessConfig`) no declaran
 * a propósito — son interfaces normales, no blobs sin forma. Esto sólo
 * afirma "esto va a una columna jsonb", no relaja ninguna validación real:
 * la forma la sigue garantizando el tipo de origen (`Product`, `BusinessConfig`).
 */
export function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

/** Fila de Supabase (snake_case) → `Product` del dominio (camelCase). */
export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    category: row.category as Product['category'],
    subcategory: row.subcategory ?? undefined,
    price: Number(row.price),
    promotion: (row.promotion as Promotion | null) ?? undefined,
    imageUrl: row.image_url ?? undefined,
    available: row.available,
    active: row.active,
    stock: row.stock ?? undefined,
    suggestedProductIds: row.suggested_product_ids ?? undefined,
    barcode: row.barcode ?? undefined,
  };
}

/** `Product` del dominio → fila lista para `upsert` en Supabase. */
export function productToRow(product: Product): ProductInsert {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    category: product.category,
    subcategory: product.subcategory ?? null,
    price: product.price,
    promotion: product.promotion ? toJson(product.promotion) : null,
    image_url: product.imageUrl ?? null,
    available: product.available,
    active: product.active ?? true,
    stock: product.stock ?? null,
    suggested_product_ids: product.suggestedProductIds ?? null,
    barcode: product.barcode ?? null,
    updated_at: new Date().toISOString(),
  };
}

/** Fila de Supabase → `Order`, prefiriendo el perfil vigente cuando vino joineado. */
export function rowToOrder(row: OrderRow | OrderWithCustomerRow): Order {
  const account = 'customer_account' in row ? row.customer_account : null;
  const accountName = account ? `${account.nombre} ${account.apellido}`.trim() : '';

  return {
    id: row.id,
    createdAt: row.created_at,
    customerId: row.customer_id ?? undefined,
    customer: {
      name: accountName || row.customer_name,
      phone: account?.telefono || row.customer_phone,
      address: row.customer_address ?? undefined,
      dni: account?.dni || undefined,
      accountAddress: account?.direccion || undefined,
    },
    items: row.items as unknown as OrderItem[],
    total: Number(row.total),
    delivery: row.delivery as Order['delivery'],
    paymentMethod: row.payment_method,
    status: row.status as Order['status'],
    payment: row.payment_status as Order['payment'],
    notes: row.notes ?? undefined,
    history: (row.history as unknown as OrderEvent[] | null) ?? [],
  };
}

/** `Order` recién armado del lado del cliente → fila para el `insert` del checkout. */
export function orderToRow(order: Order): OrderInsert {
  return {
    id: order.id,
    created_at: order.createdAt,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_address: order.customer.address ?? null,
    items: toJson(order.items),
    total: order.total,
    delivery: order.delivery,
    payment_method: order.paymentMethod,
    status: order.status,
    payment_status: order.payment,
    notes: order.notes ?? null,
    history: toJson(order.history),
  };
}

/**
 * `business_config` es una sola fila con todo en `data` (jsonb): el objeto
 * `BusinessConfig` ya se trata como un blob cohesivo en el resto del código
 * (`{...seed, ...stored}`), así que acá no hace falta mapear campo por campo.
 */
export function rowToBusinessConfig(data: unknown, seed: BusinessConfig): BusinessConfig {
  if (typeof data !== 'object' || data === null) return seed;
  return { ...seed, ...(data as Partial<BusinessConfig>) };
}
