import type { BusinessConfig } from '@/types';

/**
 * Único lugar donde viven los datos del comercio.
 *
 * Todo lo que el dueño puede querer cambiar sin tocar código (número de
 * WhatsApp, dirección, horarios, la franja de ofertas) sale de acá. Ningún
 * componente repite estos valores.
 *
 * Los datos son los reales de la ficha de Google del local.
 */
export const BUSINESS: BusinessConfig = {
  name: 'Super Todo',
  tagline: 'Tu almacén de Monte Chingolo',

  // wa.me exige sólo dígitos: 54 (país) + 9 (celular) + 11 (área) + número.
  whatsappNumber: '5491136225341',
  whatsappDisplay: '+54 11 3622-5341',

  address: {
    street: 'Cnel. Aguilar 3517',
    neighborhood: 'Monte Chingolo',
    city: 'Lanús',
  },

  rating: 4.6,

  hours: [
    { label: 'Lunes a viernes', value: '8 a 13 · 17 a 21' },
    { label: 'Sábados', value: '8 a 14 · 17 a 21' },
    { label: 'Domingos', value: 'Cerrado' },
  ],

  pickup: {
    title: 'Retiro por el local',
    detail: 'Preparamos tu pedido y te avisamos en tu cuenta cuando está listo.',
  },

  delivery: {
    radiusKm: 5,
    note: 'Hacemos envíos hasta 5 km a la redonda de Monte Chingolo. Si tu domicilio queda más lejos, mejor coordiná el retiro o escribinos antes de pedir.',
  },

  offerBanner: {
    title: 'Ofertas de la semana',
    detail: 'Precios vigentes hasta el sábado a las 21h',
  },

  offerDeadline: '21:00',

  /**
   * Equipo que prepara los pedidos.
   *
   * Los teléfonos van **vacíos a propósito**: no se inventan números. Mientras
   * estén en blanco, el panel muestra el botón de WhatsApp deshabilitado con la
   * indicación de que falta cargarlo, en vez de generar un `wa.me` inválido.
   * Se completan desde Configuración.
   */
  team: [
    { name: 'Ariel', phone: '' },
    { name: 'Leo', phone: '' },
  ],

  /** Se activan/desactivan desde Configuración. Débito/crédito arranca apagado. */
  paymentMethods: [
    { id: 'efectivo', label: 'Efectivo', enabled: true },
    { id: 'online', label: 'Online', enabled: true },
    { id: 'tarjeta', label: 'Débito o crédito', enabled: false },
  ],

  /**
   * Punto de partida del catálogo. Desde acá se editan en el panel
   * (Categorías): se agregan, renombran, reordenan y se les cuelgan
   * subcategorías. Los tintes son los pastel elegidos a mano que hacen que la
   * grilla se lea ordenada mientras los productos no tienen foto.
   */
  categories: [
    { slug: 'almacen', name: 'Almacén', tint: ['#FDF0D5', '#F7E0AE'], subcategories: [] },
    { slug: 'bebidas', name: 'Bebidas', tint: ['#FBE3DC', '#F5C8BC'], subcategories: [] },
    { slug: 'lacteos', name: 'Lácteos', tint: ['#E3F0FA', '#C6E0F2'], subcategories: [] },
    { slug: 'fiambreria', name: 'Fiambrería', tint: ['#FBE6EA', '#F3C7D0'], subcategories: [] },
    { slug: 'limpieza', name: 'Limpieza', tint: ['#E0F2F1', '#BEE3E1'], subcategories: [] },
    { slug: 'catering', name: 'Catering', tint: ['#EDE7F6', '#D6C9EC'], subcategories: [] },
  ],
};

/** Dirección en una línea, que es como se usa casi siempre. */
export const FULL_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city}`;
