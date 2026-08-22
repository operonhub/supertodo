/**
 * Prueba del RPC `cancel_order()` (fase G) sobre Postgres de verdad, en PGlite.
 *
 * Lo que se verifica no es tanto el camino feliz como los "no": que no se pueda
 * cancelar un pedido ajeno, ni uno que el local ya empezó a preparar, y que la
 * respuesta a un pedido ajeno sea indistinguible de la de uno inexistente.
 *
 *   npm run test:sql
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUÍ = dirname(fileURLToPath(import.meta.url));
const MIGRACIÓN = readFileSync(
  join(AQUÍ, '..', 'supabase', 'migrations', '20260822010157_phase_g_customer_cancel_order.sql'),
  'utf8',
);

const ANA = '11111111-1111-1111-1111-111111111111';
const BETO = '22222222-2222-2222-2222-222222222222';

const db = new PGlite();
await db.exec('create role anon; create role authenticated;');

/* PostgREST expone el `sub` del JWT como GUC y `auth.uid()` lo lee de ahí.
   Se replica igual para poder actuar como una cuenta u otra en la prueba. */
await db.exec(`
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table public.orders (
    id text primary key,
    created_at timestamptz not null default now(),
    customer_name text not null, customer_phone text not null, customer_address text,
    customer_id uuid, delivery text not null, payment_method text not null,
    payment_status text not null default 'falta_pagar',
    status text not null default 'nuevo', notes text,
    items jsonb not null default '[]'::jsonb,
    history jsonb not null default '[]'::jsonb,
    total numeric not null default 0
  );
`);

await db.exec(MIGRACIÓN);
console.log('✓ La migración se aplica sin errores\n');

const comoAna = () => db.query(`select set_config('request.jwt.claim.sub', '${ANA}', false)`);
const comoBeto = () => db.query(`select set_config('request.jwt.claim.sub', '${BETO}', false)`);
const comoAnónimo = () => db.query(`select set_config('request.jwt.claim.sub', '', false)`);

let pruebas = 0, ok = 0;
function assert(nombre, cond, detalle) {
  pruebas++;
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else console.log(`  ✗ ${nombre} → ${detalle}`);
}

let n = 0;
async function crearPedido(customerId, status) {
  const id = `P${++n}`;
  await db.query(
    `insert into public.orders (id, customer_name, customer_phone, delivery, payment_method, customer_id, status, total)
     values ($1,'Ana','11','retiro','Efectivo',$2,$3,1000)`,
    [id, customerId, status],
  );
  return id;
}

async function cancelar(id) {
  try {
    const { rows } = await db.query('select * from public.cancel_order($1)', [id]);
    return { ok: true, fila: rows[0] };
  } catch (e) {
    return { ok: false, code: e.code ?? '?', message: e.message };
  }
}

console.log('— Camino feliz —');
await comoAna();

let id = await crearPedido(ANA, 'nuevo');
let r = await cancelar(id);
assert('cancela un pedido propio en estado nuevo', r.ok && r.fila.status === 'cancelado', JSON.stringify(r));
assert('deja constancia en el historial',
  r.ok && r.fila.history.at(-1)?.status === 'cancelado', JSON.stringify(r.fila?.history));
assert('el `at` del historial es ISO como el del panel',
  r.ok && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.fila.history.at(-1)?.at ?? ''),
  JSON.stringify(r.fila?.history?.at(-1)));

r = await cancelar(id);
assert('cancelar dos veces no falla (idempotente)', r.ok && r.fila.status === 'cancelado', JSON.stringify(r));

id = await crearPedido(ANA, 'sin_confirmar');
r = await cancelar(id);
assert('cancela un pedido legacy sin confirmar', r.ok && r.fila.status === 'cancelado', JSON.stringify(r));

console.log('\n— Lo que no se puede —');

for (const estado of ['preparando', 'listo', 'en_reparto', 'entregado']) {
  id = await crearPedido(ANA, estado);
  r = await cancelar(id);
  assert(`no cancela un pedido en "${estado}"`, !r.ok && r.code === 'PT004', JSON.stringify(r));
  const { rows } = await db.query('select status from public.orders where id=$1', [id]);
  assert(`el pedido en "${estado}" queda intacto`, rows[0].status === estado, JSON.stringify(rows[0]));
}

const deBeto = await crearPedido(BETO, 'nuevo');
r = await cancelar(deBeto);
assert('Ana no puede cancelar un pedido de Beto', !r.ok && r.code === 'PT005', JSON.stringify(r));

const inexistente = await cancelar('NO-EXISTE');
assert('un pedido ajeno y uno inexistente dan la misma respuesta',
  !r.ok && !inexistente.ok && r.code === inexistente.code && r.message === inexistente.message,
  JSON.stringify({ ajeno: r, inexistente }));

const { rows: intacto } = await db.query('select status from public.orders where id=$1', [deBeto]);
assert('el pedido de Beto sigue en nuevo', intacto[0].status === 'nuevo', JSON.stringify(intacto[0]));

await comoBeto();
r = await cancelar(deBeto);
assert('Beto sí puede cancelar el suyo', r.ok && r.fila.status === 'cancelado', JSON.stringify(r));

await comoAnónimo();
const huérfano = await crearPedido(null, 'nuevo');
r = await cancelar(huérfano);
assert('sin sesión no se cancela ni un pedido sin dueño', !r.ok && r.code === 'PT005', JSON.stringify(r));

console.log(`\n${ok} de ${pruebas} comprobaciones OK`);
process.exit(ok === pruebas ? 0 : 1);
