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
    detail: 'Preparamos tu pedido y te avisamos por WhatsApp cuando está listo.',
  },

  offerBanner: {
    title: 'Ofertas de la semana',
    detail: 'Precios vigentes hasta el sábado a las 21h',
  },
};

/** Dirección en una línea, que es como se usa casi siempre. */
export const FULL_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city}`;
