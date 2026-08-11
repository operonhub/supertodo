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
  /**
   * Publicado o no. Distinto de `available`: "no lo vendo más" (inactivo) no es
   * lo mismo que "hoy se me acabó" (sin stock). Un producto inactivo ni siquiera
   * aparece en el catálogo público.
   *
   * Opcional para no tener que tocar las 31 entradas del mock: se lee siempre
   * con `isActive()`, que trata `undefined` como activo.
   */
  active?: boolean;
  /**
   * Control de stock simple y opcional. `undefined` = no lleva control (siempre
   * disponible); `0` = sin stock. El admin mantiene `available` en sincronía
   * con este número al guardar.
   */
  stock?: number;
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
  /**
   * Hasta qué hora valen las ofertas del día, en formato "HH:MM".
   * Lo edita el dueño desde Configuración.
   */
  offerDeadline: string;
  /** A quién se le manda la preparación de un pedido por WhatsApp. */
  team: TeamMember[];
}

export interface TeamMember {
  name: string;
  /**
   * Sólo dígitos, formato internacional. **Vacío mientras no esté cargado**:
   * con el teléfono en blanco no se arma ningún link `wa.me`, se muestra el
   * botón deshabilitado. Nunca inventar un número.
   */
  phone: string;
}

/* ================================================================
   PEDIDOS
================================================================ */

/**
 * Estado operativo del pedido. Va **separado del pago** a propósito: un pedido
 * puede estar entregado y sin pagar (fiado, que en un almacén de barrio pasa
 * todo el tiempo), o pagado por transferencia y todavía sin preparar.
 */
export type OrderStatus =
  | 'nuevo'
  | 'preparando'
  | 'listo'
  | 'en_reparto'
  | 'entregado'
  | 'cancelado';

export type PaymentStatus = 'falta_pagar' | 'pagado';

export type DeliveryMode = 'retiro' | 'reparto';

/**
 * Línea de un pedido.
 *
 * Guarda el nombre y el precio **congelados al momento de la compra**, no una
 * referencia al producto: si mañana sube el aceite, el pedido de hoy tiene que
 * seguir diciendo lo que costó hoy. `productId` queda sólo como trazabilidad.
 */
export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

/** Un cambio de estado, para el historial del pedido. */
export interface OrderEvent {
  status: OrderStatus;
  at: string;
}

export interface Order {
  /** Número visible para el dueño y el cliente: "1042". */
  id: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
  total: number;
  delivery: DeliveryMode;
  status: OrderStatus;
  payment: PaymentStatus;
  notes?: string;
  history: OrderEvent[];
}

/* ================================================================
   CATERING
================================================================ */

export type CateringStatus = 'nueva' | 'presupuesto' | 'confirmado' | 'realizado';

export interface CateringInquiry {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  /** Qué tipo de evento: "Cumpleaños de 50", "Acto de fin de curso". */
  event: string;
  /** Fecha del evento en formato "YYYY-MM-DD". */
  eventDate: string;
  people: number;
  status: CateringStatus;
  notes?: string;
}
