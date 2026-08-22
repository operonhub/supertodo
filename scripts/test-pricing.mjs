/**
 * Prueba del trigger `price_order()` (fase F) sobre Postgres de verdad.
 *
 * Corre la migración en PGlite —Postgres compilado a WASM, con plpgsql— así que
 * lo que se ejecuta acá es exactamente el SQL que se aplica en Supabase, sin
 * Docker ni base remota.
 *
 * Lo que importa que no se rompa nunca: el trigger tiene que dar EXACTAMENTE el
 * mismo número que `src/lib/products.ts`. Si difieren en un peso, la base
 * rechaza pedidos legítimos en el checkout. Por eso la primera prueba compara
 * miles de combinaciones contra las fórmulas del front en vez de contra
 * constantes escritas a mano.
 *
 *   npm run test:pricing
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUÍ = dirname(fileURLToPath(import.meta.url));
const MIGRACIÓN = readFileSync(
  join(AQUÍ, '..', 'supabase', 'migrations', '20260822010134_phase_f_server_side_pricing.sql'),
  'utf8',
);

/* Copia literal de las fórmulas de src/lib/products.ts: es contra ESTO que el
   trigger tiene que dar el mismo número, así que se replican tal cual. */
const jsUnitPrice = (price, promo) =>
  promo?.type !== 'percent' || !promo.percent ? price : Math.round(price * (1 - promo.percent / 100));

const jsLineSubtotal = (price, promo, quantity) => {
  const c = Math.max(0, Math.floor(quantity));
  if (c === 0) return 0;
  if (promo?.type === '3x2') return (c - Math.floor(c / 3)) * price;
  if (promo?.type === '2x1') return (c - Math.floor(c / 2)) * price;
  return jsUnitPrice(price, promo) * c;
};

const db = new PGlite();
await db.exec('create role anon; create role authenticated;');
await db.exec(`
  create table public.products (
    id text primary key, name text not null, unit text not null, category text not null,
    price numeric not null, promotion jsonb,
    available boolean not null default true, active boolean not null default true
  );
  create table public.orders (
    id text primary key, created_at timestamptz not null default now(),
    customer_name text not null, customer_phone text not null, customer_address text,
    customer_id uuid, delivery text not null, payment_method text not null,
    payment_status text not null default 'falta_pagar', status text not null default 'nuevo',
    notes text, items jsonb not null, history jsonb not null default '[]'::jsonb,
    total numeric not null
  );
`);
await db.exec(MIGRACIÓN);
console.log('✓ La migración se aplica sin errores\n');

let n = 0, pruebas = 0, ok = 0;

async function pedir(items, total) {
  const id = `T${++n}`;
  try {
    await db.query(
      `insert into public.orders (id, customer_name, customer_phone, delivery, payment_method, items, total)
       values ($1,'Santi','11','retiro','Efectivo',$2,$3)`,
      [id, JSON.stringify(items), total],
    );
    const { rows } = await db.query('select items, total from public.orders where id=$1', [id]);
    return { ok: true, items: rows[0].items, total: Number(rows[0].total) };
  } catch (e) {
    return { ok: false, code: e.code ?? '?', message: e.message };
  }
}

function assert(nombre, cond, detalle) {
  pruebas++;
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else console.log(`  ✗ ${nombre} → ${detalle}`);
}

const L = (productId, quantity, extra = {}) =>
  ({ productId, quantity, name: 'x', unit: 'x', unitPrice: 0, subtotal: 0, ...extra });

/* ---------- Prueba de propiedad: el SQL contra el JS ---------- */

const PROMOS = [null, { type: '3x2' }, { type: '2x1' },
  ...[1, 5, 10, 13, 17, 20, 25, 30, 33, 40, 50, 66, 75, 90, 99].map((p) => ({ type: 'percent', percent: p }))];
const PRECIOS = [1, 3, 7, 15, 99, 125, 333, 999, 1234, 1665, 1990, 2750, 5400, 9999, 123456];
const CANTIDADES = [1, 2, 3, 4, 5, 6, 7, 11, 999];

console.log('— El SQL calcula lo mismo que products.ts —');

let combos = 0, divergencias = [];
for (const [i, promo] of PROMOS.entries()) {
  for (const [j, price] of PRECIOS.entries()) {
    const pid = `p${i}_${j}`;
    await db.query(
      `insert into public.products (id,name,unit,category,price,promotion) values ($1,$2,'u','c',$3,$4)`,
      [pid, `Producto ${pid}`, price, promo ? JSON.stringify(promo) : null],
    );
    for (const q of CANTIDADES) {
      combos++;
      const esperado = jsLineSubtotal(price, promo, q);
      const r = await pedir([L(pid, q)], esperado);
      if (!r.ok || r.total !== esperado) {
        divergencias.push({ price, promo, q, esperado, obtenido: r.ok ? r.total : r.code });
      }
    }
  }
}
assert(`${combos} combinaciones de precio × promo × cantidad coinciden con JS`,
  divergencias.length === 0, JSON.stringify(divergencias.slice(0, 5)));

/* ---------- Defensa ---------- */

await db.query(`insert into public.products (id,name,unit,category,price,promotion) values
  ('aceite','Aceite Natura','900 ml','almacen',2750,'{"type":"percent","percent":20}'),
  ('fideos','Fideos Matarazzo','500 g','almacen',1990,'{"type":"percent","percent":17}'),
  ('pan','Pan lactal','600 g','panaderia',2100,null),
  ('raro','Promo mal cargada','x1','almacen',1000,'{"type":"percent","percent":"veinte"}')`);
await db.query(`update public.products set active=false where id='pan'`);

console.log('\n— Defensa —');
let r;
r = await pedir([L('aceite', 2)], 1);
assert('rechaza un pedido de $1 en vez de $4400', !r.ok && r.code === 'PT001', JSON.stringify(r));

r = await pedir([L('fideos', 1, { name: 'Whisky importado', unitPrice: 99999 })], 1652);
assert('reescribe nombre y unitario desde products',
  r.ok && r.items[0].name === 'Fideos Matarazzo' && r.items[0].unitPrice == 1652, JSON.stringify(r.items?.[0]));

r = await pedir([L('pan', 1)], 2100);
assert('rechaza un producto dado de baja', !r.ok && r.code === 'PT002', JSON.stringify(r));

r = await pedir([L('no-existe', 1)], 500);
assert('rechaza un producto inexistente', !r.ok && r.code === 'PT002', JSON.stringify(r));

for (const [nombre, q] of [['negativa', -5], ['cero', 0], ['texto', 'muchas'], ['absurda', 1000000]]) {
  r = await pedir([L('aceite', q)], 100);
  assert(`rechaza cantidad ${nombre}`, !r.ok && r.code === 'PT003', JSON.stringify(r));
}

// 1,5 unidades no es un error del cliente sino un carrito imposible: se trunca
// igual que `Math.floor` en getLineSubtotal y se cobra 1.
r = await pedir([L('aceite', 1.5)], 2200);
assert('cantidad decimal se trunca a 1 unidad',
  r.ok && r.total === 2200 && r.items[0].quantity === 1, JSON.stringify(r));

r = await pedir([], 0);
assert('rechaza carrito vacío', !r.ok && r.code === 'PT003', JSON.stringify(r));

r = await pedir(Array.from({ length: 201 }, () => L('aceite', 1)), 442750);
assert('rechaza un carrito de 201 líneas', !r.ok && r.code === 'PT003', JSON.stringify(r));

console.log('\n— Bordes —');
r = await pedir([L('aceite', 2)], 4401);
assert('tolera 1 peso de resto y guarda el total real', r.ok && r.total === 4400, JSON.stringify(r));

r = await pedir([L('aceite', 2)], 4402);
assert('rechaza 2 pesos de diferencia', !r.ok && r.code === 'PT001', JSON.stringify(r));

r = await pedir([L('raro', 2)], 2000);
assert('promo corrupta cae a precio de lista', r.ok && r.total === 2000, JSON.stringify(r));

r = await pedir([L('aceite', 1)], 2200);
assert('etiqueta de promo es "−20%"', r.ok && r.items[0].promotionLabel === '−20%', JSON.stringify(r.items?.[0]));

r = await pedir([L('aceite', 2), L('fideos', 3)], 4400 + 1652 * 3);
assert('suma varias líneas con promos distintas', r.ok && r.total === 9356, JSON.stringify(r));

console.log(`\n${ok} de ${pruebas} comprobaciones OK — ${n} inserts probados`);
process.exit(ok === pruebas ? 0 : 1);
