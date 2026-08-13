// Puebla/refresca `precios_claros_productos` con datos de la API pública y
// sin key de Precios Claros (preciosclaros.gob.ar), el sistema oficial de
// precios del gobierno argentino. Se corre a mano, no por cron: la relación
// código de barras↔nombre no cambia tan seguido como para justificar
// automatizarlo, y el precio no es un dato que la app use (el dueño carga
// el suyo en Productos).
//
// Uso: node --env-file=.env.local scripts/ingest-precios-claros.mjs
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://d3e6htiiul5ek9.cloudfront.net/dev/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };
const PAGE_SIZE = 100;
const PAUSA_MS = 150;

/**
 * Dos o tres sucursales por cadena grande, repartidas en distintas
 * provincias (Buenos Aires primero), sacadas de recorrer `GET sucursales`
 * y filtrar por `banderaDescripcion` exacto — no son IDs inventados.
 * Carrefour no aparece en los datos de Precios Claros (no está entre las
 * banderas que reporta la API); el resto de las grandes cadenas del país sí.
 */
const SUCURSALES = [
  { id: '15-1-5291', nombre: 'DIA - San Martín (Bs. As.)' },
  { id: '15-1-8005', nombre: 'DIA - Salta' },
  { id: '15-1-782', nombre: 'DIA - Balvanera (CABA)' },
  { id: '2-1-260', nombre: 'La Anónima - 9 de Julio (Bs. As.)' },
  { id: '2-1-384', nombre: 'La Anónima - Salta' },
  { id: '2-1-385', nombre: 'La Anónima - Santiago del Estero' },
  { id: '9-1-127', nombre: 'Vea - Bahía Blanca (Bs. As.)' },
  { id: '9-1-140', nombre: 'Vea - Orán (Salta)' },
  { id: '9-1-119', nombre: 'Vea - Aráoz (CABA)' },
  { id: '12-1-67', nombre: 'Coto - Albarellos (Bs. As.)' },
  { id: '12-1-91', nombre: 'Coto - Abasto (CABA)' },
  { id: '12-1-109', nombre: 'Coto - Paraná (Entre Ríos)' },
  { id: '9-2-37', nombre: 'Disco - Adrogué (Bs. As.)' },
  { id: '9-2-38', nombre: 'Disco - Arcos (CABA)' },
  { id: '9-2-953', nombre: 'Disco - Venado Tuerto (Santa Fe)' },
  { id: '9-3-5214', nombre: 'Jumbo - Escobar (Bs. As.)' },
  { id: '9-3-5251', nombre: 'Jumbo - Salta' },
  { id: '9-3-5276', nombre: 'Jumbo - Arenales (CABA)' },
  { id: '16-1-1302', nombre: 'Libertad - Salta' },
  { id: '16-1-1002', nombre: 'Libertad - Santiago del Estero' },
  { id: '16-1-902', nombre: 'Libertad - Chaco' },
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function traerProductosDeSucursal(idSucursal) {
  const productos = new Map();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = `${BASE}productos?id_sucursal=${idSucursal}&offset=${offset}&limit=${PAGE_SIZE}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) break;

    const data = await res.json();
    total = data.total ?? 0;

    // El mismo `id` (código de barras) puede repetirse dentro de la propia
    // sucursal si hay variantes de presentación mal deduplicadas en origen;
    // el `Map` se queda con la última.
    for (const p of data.productos ?? []) {
      if (!p.id || !p.nombre) continue;
      productos.set(p.id, {
        barcode: p.id,
        nombre: p.nombre,
        marca: p.marca || null,
        presentacion: p.presentacion || null,
        fuente_sucursal_id: idSucursal,
        updated_at: new Date().toISOString(),
      });
    }

    offset += PAGE_SIZE;
    await esperar(PAUSA_MS);
  }

  return [...productos.values()];
}

async function main() {
  let totalCargado = 0;

  for (const { id, nombre } of SUCURSALES) {
    const productos = await traerProductosDeSucursal(id);

    for (let i = 0; i < productos.length; i += 500) {
      const lote = productos.slice(i, i + 500);
      const { error } = await supabase
        .from('precios_claros_productos')
        .upsert(lote, { onConflict: 'barcode' });
      if (error) throw new Error(`${nombre} (${id}): ${error.message}`);
    }

    totalCargado += productos.length;
    console.log(`${nombre} (${id}): ${productos.length} productos`);
  }

  console.log(`Total cargado: ${totalCargado} productos distintos (antes de deduplicar entre sucursales)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
