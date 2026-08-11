import type { Json, Tables, TablesInsert } from '@/lib/supabase/database.types';
import type { BusinessConfig, Product, Promotion } from '@/types';

type ProductRow = Tables<'products'>;
type ProductInsert = TablesInsert<'products'>;

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
    price: Number(row.price),
    promotion: (row.promotion as Promotion | null) ?? undefined,
    imageUrl: row.image_url ?? undefined,
    available: row.available,
    active: row.active,
    stock: row.stock ?? undefined,
    suggestedProductIds: row.suggested_product_ids ?? undefined,
  };
}

/** `Product` del dominio → fila lista para `upsert` en Supabase. */
export function productToRow(product: Product): ProductInsert {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    category: product.category,
    price: product.price,
    promotion: product.promotion ? toJson(product.promotion) : null,
    image_url: product.imageUrl ?? null,
    available: product.available,
    active: product.active ?? true,
    stock: product.stock ?? null,
    suggested_product_ids: product.suggestedProductIds ?? null,
    updated_at: new Date().toISOString(),
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
