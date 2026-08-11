/**
 * Modelos de dominio del catálogo.
 *
 * Están pensados para que migrar a Supabase (o a cualquier API) sea copiar
 * estas formas a la tabla y cambiar sólo la función que trae los datos:
 * ningún componente sabe de dónde salen los productos.
 */

/** Identificador estable de categoría. Es el que viaja en la URL o en la DB. */
export type CategorySlug =
  | 'almacen'
  | 'bebidas'
  | 'lacteos'
  | 'fiambreria'
  | 'limpieza'
  | 'catering';

export interface Category {
  slug: CategorySlug;
  /** Nombre visible, con acentos. */
  name: string;
}

export interface Product {
  id: string;
  name: string;
  /** Presentación: "900 ml", "1 kg", "x4". Se muestra debajo del nombre. */
  unit: string;
  category: CategorySlug;
  /** Precio vigente en pesos. Es el que se cobra y el que suma al total. */
  price: number;
  /**
   * Precio tachado. Sólo se completa cuando el producto está en oferta;
   * el porcentaje de descuento se deriva de estos dos números
   * (ver `getDiscountPercent`) para que nunca queden desincronizados.
   */
  previousPrice?: number;
  /**
   * Foto real del producto. Mientras esté vacío se dibuja un placeholder
   * derivado de la categoría, así el catálogo se ve consistente aunque
   * todavía no haya fotos cargadas.
   */
  imageUrl?: string;
  /** Un producto sin stock se muestra pero no se puede agregar. */
  available: boolean;
}

/** Lo único que se persiste del carrito: qué y cuánto. */
export interface CartItem {
  productId: string;
  quantity: number;
}

/** Ítem del carrito ya resuelto contra el catálogo, listo para mostrar. */
export interface CartLine {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface CartSummary {
  lines: CartLine[];
  /** Cantidad de productos distintos (no de unidades). */
  itemCount: number;
  /** Suma de todas las unidades. */
  unitCount: number;
  total: number;
}

export interface OpeningHours {
  /** "Lunes a viernes", "Sábados"… */
  label: string;
  /** "8 a 13 · 17 a 21" o "Cerrado". */
  value: string;
}

export interface BusinessConfig {
  name: string;
  tagline: string;
  /**
   * Número en formato internacional, sólo dígitos, como lo pide wa.me
   * (código de país + 9 + área + número, sin espacios ni signos).
   */
  whatsappNumber: string;
  /** El mismo número pero legible, para mostrarlo en pantalla. */
  whatsappDisplay: string;
  address: {
    street: string;
    neighborhood: string;
    city: string;
  };
  /** Puntaje de Google, para dar confianza en el header. */
  rating?: number;
  hours: OpeningHours[];
  /** Cómo recibe el pedido el cliente. Hoy sólo retiro por el local. */
  pickup: {
    title: string;
    detail: string;
  };
  /**
   * Franja de ofertas del día. En `null` la barra no se muestra,
   * así se puede apagar sin tocar componentes.
   */
  offerBanner: {
    title: string;
    detail: string;
  } | null;
}
