import type { DeliveryMode, Order, OrderItem, OrderStatus, PaymentStatus } from '@/types';

/**
 * Pedidos de muestra.
 *
 * Se definen con `minutosAtrás` en vez de fechas fijas por dos razones:
 *
 * 1. La demo siempre tiene "pedidos de hoy", sin importar cuándo se abra.
 * 2. Evita el desajuste de hidratación: si las fechas se calcularan con
 *    `new Date()` al cargar el módulo, el HTML generado en el build tendría una
 *    hora y el navegador otra. Se materializan en el cliente (ver `orderStore`).
 */
interface OrderSeed {
  id: string;
  minutosAtrás: number;
  customer: { name: string; phone: string };
  items: Array<{ productId: string; name: string; unit: string; quantity: number; unitPrice: number }>;
  delivery: DeliveryMode;
  status: OrderStatus;
  payment: PaymentStatus;
  notes?: string;
}

const SEEDS: OrderSeed[] = [
  {
    id: '1047',
    minutosAtrás: 8,
    customer: { name: 'Jorge Ferreyra', phone: '+54 11 5512-3344' },
    items: [
      { productId: 'aceite-natura-900', name: 'Aceite de girasol Natura', unit: '900 ml', quantity: 2, unitPrice: 2200 },
      { productId: 'fideos-matarazzo-500', name: 'Fideos tirabuzón Matarazzo', unit: '500 g', quantity: 3, unitPrice: 1650 },
    ],
    delivery: 'retiro',
    status: 'nuevo',
    payment: 'falta_pagar',
  },
  {
    id: '1046',
    minutosAtrás: 22,
    customer: { name: 'Diego Sosa', phone: '+54 11 6644-2211' },
    items: [
      { productId: 'coca-cola-225', name: 'Coca Cola', unit: '2,25 L', quantity: 2, unitPrice: 3200 },
      { productId: 'paty-x4', name: 'Hamburguesas Paty', unit: 'x4 unidades', quantity: 1, unitPrice: 3950 },
    ],
    delivery: 'reparto',
    status: 'nuevo',
    payment: 'pagado',
    notes: 'Timbre roto, llamar por teléfono al llegar.',
  },
  {
    id: '1045',
    minutosAtrás: 55,
    customer: { name: 'Marcela Domínguez', phone: '+54 11 3399-8877' },
    items: [
      { productId: 'leche-serenisima-1l', name: 'Leche entera La Serenísima', unit: '1 L', quantity: 4, unitPrice: 1850 },
      { productId: 'yerba-playadito-1k', name: 'Yerba mate Playadito', unit: '1 kg', quantity: 1, unitPrice: 4990 },
      { productId: 'azucar-ledesma-1k', name: 'Azúcar Ledesma', unit: '1 kg', quantity: 2, unitPrice: 1780 },
    ],
    delivery: 'retiro',
    status: 'preparando',
    payment: 'falta_pagar',
  },
  {
    id: '1044',
    minutosAtrás: 95,
    customer: { name: 'Comedor Los Naranjos', phone: '+54 11 4477-9900' },
    items: [
      { productId: 'arroz-marolio-1k', name: 'Arroz largo fino Marolio', unit: '1 kg', quantity: 10, unitPrice: 1450 },
      { productId: 'lentejas-marolio', name: 'Lentejas secas Marolio', unit: '400 g', quantity: 8, unitPrice: 1590 },
      { productId: 'pure-tomate-arcor', name: 'Puré de tomate Arcor', unit: '520 g', quantity: 12, unitPrice: 990 },
    ],
    delivery: 'reparto',
    status: 'listo',
    payment: 'pagado',
    notes: 'Factura A. Entregar por la puerta de atrás.',
  },
  {
    id: '1043',
    minutosAtrás: 130,
    customer: { name: 'Rosa Benítez', phone: '+54 11 2255-6633' },
    items: [
      { productId: 'higienol-x4', name: 'Papel higiénico Higienol', unit: 'x4 rollos', quantity: 2, unitPrice: 3450 },
      { productId: 'magistral-750', name: 'Detergente Magistral', unit: '750 ml', quantity: 1, unitPrice: 2980 },
    ],
    delivery: 'retiro',
    status: 'listo',
    payment: 'falta_pagar',
  },
  {
    id: '1042',
    minutosAtrás: 165,
    customer: { name: 'Marta Ledesma', phone: '+54 11 7788-1122' },
    items: [
      { productId: 'aceite-natura-900', name: 'Aceite de girasol Natura', unit: '900 ml', quantity: 2, unitPrice: 2200 },
      { productId: 'coca-cola-225', name: 'Coca Cola', unit: '2,25 L', quantity: 1, unitPrice: 3200 },
      { productId: 'fideos-matarazzo-500', name: 'Fideos tirabuzón Matarazzo', unit: '500 g', quantity: 3, unitPrice: 1650 },
    ],
    delivery: 'retiro',
    status: 'listo',
    payment: 'falta_pagar',
    notes: 'Pasa a retirar después de las 18.',
  },
  {
    id: '1041',
    minutosAtrás: 210,
    customer: { name: 'Valeria Núñez', phone: '+54 11 6611-4455' },
    items: [
      { productId: 'quilmes-1l', name: 'Cerveza Quilmes Clásica', unit: '1 L', quantity: 6, unitPrice: 2500 },
      { productId: 'galletitas-opera', name: 'Galletitas Ópera Arcor', unit: '300 g', quantity: 2, unitPrice: 1200 },
    ],
    delivery: 'reparto',
    status: 'en_reparto',
    payment: 'pagado',
  },
  {
    id: '1040',
    minutosAtrás: 280,
    customer: { name: 'Federico Acosta', phone: '+54 11 5533-7788' },
    items: [
      { productId: 'jamon-cocido', name: 'Jamón cocido de máquina', unit: 'x kg', quantity: 1, unitPrice: 12500 },
      { productId: 'queso-cremoso-paulina', name: 'Queso cremoso La Paulina', unit: 'x kg', quantity: 1, unitPrice: 9800 },
    ],
    delivery: 'retiro',
    status: 'entregado',
    payment: 'pagado',
  },
  {
    id: '1039',
    minutosAtrás: 330,
    customer: { name: 'Griselda Molina', phone: '+54 11 9922-3311' },
    items: [
      { productId: 'yerba-playadito-1k', name: 'Yerba mate Playadito', unit: '1 kg', quantity: 1, unitPrice: 4990 },
      { productId: 'cafe-la-virginia', name: 'Café molido La Virginia', unit: '250 g', quantity: 1, unitPrice: 4200 },
    ],
    delivery: 'retiro',
    status: 'entregado',
    payment: 'pagado',
  },
  {
    id: '1038',
    minutosAtrás: 400,
    customer: { name: 'Hernán Bianchi', phone: '+54 11 3344-9977' },
    items: [
      { productId: 'vienissima-x6', name: 'Salchichas Vienissima', unit: 'x6 unidades', quantity: 3, unitPrice: 3100 },
      { productId: 'manaos-naranja', name: 'Gaseosa Manaos naranja', unit: '2,25 L', quantity: 4, unitPrice: 1450 },
    ],
    delivery: 'reparto',
    status: 'entregado',
    payment: 'falta_pagar',
    notes: 'Queda debiendo, arregla el viernes.',
  },
  {
    id: '1036',
    minutosAtrás: 60 * 26,
    customer: { name: 'Claudia Pereyra', phone: '+54 11 4488-2266' },
    items: [
      { productId: 'ala-polvo-3k', name: 'Jabón en polvo Ala', unit: '3 kg', quantity: 1, unitPrice: 6800 },
      { productId: 'lavandina-ayudin', name: 'Lavandina Ayudín', unit: '1 L', quantity: 3, unitPrice: 1250 },
    ],
    delivery: 'retiro',
    status: 'entregado',
    payment: 'pagado',
  },
  {
    id: '1034',
    minutosAtrás: 60 * 30,
    customer: { name: 'Sergio Maldonado', phone: '+54 11 7711-5599' },
    items: [
      { productId: 'coca-cola-225', name: 'Coca Cola', unit: '2,25 L', quantity: 3, unitPrice: 3200 },
    ],
    delivery: 'retiro',
    status: 'cancelado',
    payment: 'falta_pagar',
    notes: 'Se arrepintió, no pasó a buscarlo.',
  },
  {
    id: '1029',
    minutosAtrás: 60 * 74,
    customer: { name: 'Colegio San Martín', phone: '+54 11 4400-1188' },
    items: [
      { productId: 'arroz-marolio-1k', name: 'Arroz largo fino Marolio', unit: '1 kg', quantity: 20, unitPrice: 1450 },
      { productId: 'fideos-matarazzo-500', name: 'Fideos tirabuzón Matarazzo', unit: '500 g', quantity: 15, unitPrice: 1650 },
      { productId: 'aceite-natura-900', name: 'Aceite de girasol Natura', unit: '900 ml', quantity: 12, unitPrice: 2200 },
    ],
    delivery: 'reparto',
    status: 'entregado',
    payment: 'pagado',
    notes: 'Pedido mensual del comedor. Factura A.',
  },
];

const totalOf = (items: OrderItem[]) => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

/**
 * Historial verosímil: se reconstruye hacia atrás desde el estado actual, de
 * modo que un pedido "listo" muestre que antes pasó por "nuevo" y "preparando".
 */
function buildHistory(status: OrderStatus, createdAt: number): { status: OrderStatus; at: string }[] {
  const flujo: OrderStatus[] = ['nuevo', 'preparando', 'listo', 'en_reparto', 'entregado'];

  if (status === 'cancelado') {
    return [
      { status: 'nuevo', at: new Date(createdAt).toISOString() },
      { status: 'cancelado', at: new Date(createdAt + 30 * 60000).toISOString() },
    ];
  }

  const hasta = flujo.indexOf(status);
  return flujo.slice(0, hasta + 1).map((s, i) => ({
    status: s,
    at: new Date(createdAt + i * 18 * 60000).toISOString(),
  }));
}

/**
 * Materializa los pedidos de muestra con fechas reales.
 *
 * Se llama en el cliente (desde el store), nunca durante el render del
 * servidor: de ahí que las fechas sean relativas a "ahora".
 */
export function buildSeedOrders(): Order[] {
  const ahora = Date.now();

  return SEEDS.map((seed) => {
    const createdAt = ahora - seed.minutosAtrás * 60000;
    return {
      id: seed.id,
      createdAt: new Date(createdAt).toISOString(),
      customer: seed.customer,
      items: seed.items,
      total: totalOf(seed.items),
      delivery: seed.delivery,
      status: seed.status,
      payment: seed.payment,
      notes: seed.notes,
      history: buildHistory(seed.status, createdAt),
    };
  });
}
