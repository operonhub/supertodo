-- Fase D: conversación en vivo asociada a cada pedido.
-- Sólo el cliente dueño y el equipo pueden leerla; cada rol escribe únicamente
-- con su identidad real. La publicación habilita Postgres Changes en Realtime.

create table public.order_messages (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  sender_role text not null check (sender_role in ('customer', 'owner')),
  body text not null,
  created_at timestamptz not null default now()
);

create index order_messages_order_id_created_at_idx
on public.order_messages (order_id, created_at, id);

create index order_messages_author_id_idx
on public.order_messages (author_id);

alter table public.order_messages enable row level security;

revoke all on table public.order_messages from anon, authenticated;
grant select, insert on table public.order_messages to authenticated;

revoke all on sequence public.order_messages_id_seq from anon, authenticated;
grant usage on sequence public.order_messages_id_seq to authenticated;

create policy "read order chat"
on public.order_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.customer_id = (select auth.uid()) or (select public.is_admin()))
  )
);

create policy "send order chat"
on public.order_messages
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    (
      sender_role = 'customer'
      and exists (
        select 1
        from public.orders o
        where o.id = order_id
          and o.customer_id = (select auth.uid())
      )
    )
    or (sender_role = 'owner' and (select public.is_admin()))
  )
);

alter publication supabase_realtime add table public.order_messages;
