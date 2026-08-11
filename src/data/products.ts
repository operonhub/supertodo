import type { Product } from '@/types';

/**
 * Catálogo mock.
 *
 * Es la única fuente de productos del MVP. Cuando entre Supabase, esta
 * constante se reemplaza por la consulta y el resto de la app no cambia:
 * todo lo que consume productos lo hace a través de `getProducts()`.
 *
 * `promotion` sólo se completa cuando el producto está realmente en oferta.
 * `price` es SIEMPRE el precio de lista: lo que se cobra se deriva de ambos.
 */
export const PRODUCTS: Product[] = [
  // ---------- Almacén ----------
  {
    id: 'aceite-natura-900',
    name: 'Aceite de girasol Natura',
    unit: '900 ml',
    category: 'almacen',
    price: 2750,
    promotion: { type: 'percent', percent: 20 },
    available: true,
  },
  {
    id: 'fideos-matarazzo-500',
    name: 'Fideos tirabuzón Matarazzo',
    unit: '500 g',
    category: 'almacen',
    price: 1990,
    promotion: { type: 'percent', percent: 17 },
    available: true,
  },
  {
    id: 'arroz-marolio-1k',
    name: 'Arroz largo fino Marolio',
    unit: '1 kg',
    category: 'almacen',
    price: 1800,
    promotion: { type: 'percent', percent: 19 },
    available: true,
  },
  {
    id: 'yerba-playadito-1k',
    name: 'Yerba mate Playadito',
    unit: '1 kg',
    category: 'almacen',
    price: 5900,
    promotion: { type: 'percent', percent: 15 },
    available: true,
  },
  {
    id: 'galletitas-opera',
    name: 'Galletitas Ópera Arcor',
    unit: '300 g',
    category: 'almacen',
    price: 1450,
    promotion: { type: 'percent', percent: 17 },
    available: true,
  },
  {
    id: 'azucar-ledesma-1k',
    name: 'Azúcar Ledesma',
    unit: '1 kg',
    category: 'almacen',
    price: 1780,
    available: true,
  },
  {
    id: 'pure-tomate-arcor',
    name: 'Puré de tomate Arcor',
    unit: '520 g',
    category: 'almacen',
    price: 990,
    available: true,
  },
  {
    id: 'harina-blancaflor-1k',
    name: 'Harina 000 Blancaflor',
    unit: '1 kg',
    category: 'almacen',
    price: 1350,
    available: true,
  },
  {
    id: 'cafe-la-virginia',
    name: 'Café molido La Virginia',
    unit: '250 g',
    category: 'almacen',
    price: 4200,
    available: true,
  },
  {
    id: 'lentejas-marolio',
    name: 'Lentejas secas Marolio',
    unit: '400 g',
    category: 'almacen',
    price: 1590,
    available: true,
  },

  // ---------- Bebidas ----------
  {
    id: 'coca-cola-225',
    name: 'Coca Cola',
    unit: '2,25 L',
    category: 'bebidas',
    price: 3800,
    promotion: { type: '3x2' },
    available: true,
  },
  {
    id: 'quilmes-1l',
    name: 'Cerveza Quilmes Clásica',
    unit: '1 L',
    category: 'bebidas',
    price: 2900,
    promotion: { type: '2x1' },
    available: true,
  },
  {
    id: 'manaos-naranja',
    name: 'Gaseosa Manaos naranja',
    unit: '2,25 L',
    category: 'bebidas',
    price: 1450,
    available: true,
  },
  {
    id: 'villavicencio-2l',
    name: 'Agua mineral Villavicencio',
    unit: '2 L',
    category: 'bebidas',
    price: 1650,
    available: true,
  },
  {
    id: 'cepita-naranja',
    name: 'Jugo Cepita naranja',
    unit: '1 L',
    category: 'bebidas',
    price: 1890,
    available: true,
  },

  // ---------- Lácteos ----------
  {
    id: 'leche-serenisima-1l',
    name: 'Leche entera La Serenísima',
    unit: '1 L',
    category: 'lacteos',
    price: 2100,
    promotion: { type: 'percent', percent: 12 },
    available: true,
  },
  {
    id: 'yogur-ser-frutilla',
    name: 'Yogur bebible Ser frutilla',
    unit: '900 g',
    category: 'lacteos',
    price: 2450,
    available: true,
  },
  {
    id: 'queso-cremoso-paulina',
    name: 'Queso cremoso La Paulina',
    unit: 'x kg',
    category: 'lacteos',
    price: 9800,
    available: true,
  },
  {
    id: 'manteca-sancor',
    name: 'Manteca Sancor',
    unit: '200 g',
    category: 'lacteos',
    price: 2890,
    available: true,
  },
  {
    id: 'dulce-leche-serenisima',
    name: 'Dulce de leche La Serenísima',
    unit: '400 g',
    category: 'lacteos',
    price: 2650,
    available: true,
  },

  // ---------- Fiambrería ----------
  {
    id: 'paty-x4',
    name: 'Hamburguesas Paty',
    unit: 'x4 unidades',
    category: 'fiambreria',
    price: 4600,
    promotion: { type: 'percent', percent: 14 },
    available: true,
  },
  {
    id: 'vienissima-x6',
    name: 'Salchichas Vienissima',
    unit: 'x6 unidades',
    category: 'fiambreria',
    price: 3100,
    available: true,
  },
  {
    id: 'jamon-cocido',
    name: 'Jamón cocido de máquina',
    unit: 'x kg',
    category: 'fiambreria',
    price: 12500,
    available: true,
  },
  {
    id: 'salame-milan',
    name: 'Salamín tipo Milán',
    unit: 'x kg',
    category: 'fiambreria',
    price: 15800,
    // Se muestra en la grilla pero no se puede agregar: sin stock hoy.
    available: false,
  },

  // ---------- Limpieza ----------
  {
    id: 'ala-polvo-3k',
    name: 'Jabón en polvo Ala',
    unit: '3 kg',
    category: 'limpieza',
    price: 8000,
    promotion: { type: 'percent', percent: 15 },
    available: true,
  },
  {
    id: 'lavandina-ayudin',
    name: 'Lavandina Ayudín',
    unit: '1 L',
    category: 'limpieza',
    price: 1250,
    available: true,
  },
  {
    id: 'magistral-750',
    name: 'Detergente Magistral',
    unit: '750 ml',
    category: 'limpieza',
    price: 2980,
    available: true,
  },
  {
    id: 'higienol-x4',
    name: 'Papel higiénico Higienol',
    unit: 'x4 rollos',
    category: 'limpieza',
    price: 3450,
    available: true,
  },

  // ---------- Catering ----------
  {
    id: 'combo-picada',
    name: 'Combo Picada',
    unit: 'por persona',
    category: 'catering',
    price: 7500,
    available: true,
  },
  {
    id: 'combo-merienda',
    name: 'Combo Merienda',
    unit: 'por persona',
    category: 'catering',
    price: 6500,
    available: true,
  },
  {
    id: 'combo-fiesta',
    name: 'Combo Fiesta',
    unit: 'por persona',
    category: 'catering',
    price: 8500,
    available: true,
  },
];

/**
 * Punto de entrada único al catálogo.
 *
 * Hoy devuelve el mock de arriba; mañana hace `await supabase.from('products')`
 * sin que ningún componente se entere. Por eso conviene que todo pase por acá.
 */
export function getProducts(): Product[] {
  return PRODUCTS;
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
