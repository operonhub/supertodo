-- Fase B: desde este punto todo pedido nace dentro de una cuenta de cliente.
-- Se elimina el INSERT anónimo legado del checkout por WhatsApp y se valida
-- en la base tanto la pertenencia como el estado inicial del pedido.

drop policy if exists insert_public on public.orders;

revoke insert on table public.orders from anon;
grant insert on table public.orders to authenticated;

create index if not exists orders_customer_id_idx
on public.orders (customer_id);

create policy "create own order"
on public.orders
for insert
to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'nuevo'
  and payment_status = 'falta_pagar'
  and total > 0
  and jsonb_array_length(items) > 0
);

-- "Online" es sólo la preferencia que el cliente declara; no agrega una
-- pasarela. Tarjeta sigue disponible en Configuración, pero queda apagada.
update public.business_config
set
  data = jsonb_set(
    data,
    '{paymentMethods}',
    '[
      {"id":"efectivo","label":"Efectivo","enabled":true},
      {"id":"online","label":"Online","enabled":true},
      {"id":"tarjeta","label":"Débito o crédito","enabled":false}
    ]'::jsonb,
    true
  ),
  updated_at = now()
where id = 1;
