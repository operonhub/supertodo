-- Fase A: separar al equipo de los clientes antes de habilitar registros.
-- La policy pública de INSERT de orders se conserva temporalmente para que
-- el checkout vigente no quede fuera de servicio entre las fases A y B.

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

insert into public.admins (user_id)
values ('2318b631-a860-4b9a-95a2-6914cc4ef13c');

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

-- is_admin() es un RPC deliberado para el gate del proxy. Un visitante
-- anónimo no necesita poder invocarlo y la tabla allowlist no se expone.
revoke all on table public.admins from anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  apellido text not null,
  telefono text not null,
  dni text not null,
  direccion text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (
    id,
    email,
    nombre,
    apellido,
    telefono,
    dni,
    direccion
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'telefono',
    new.raw_user_meta_data->>'dni',
    new.raw_user_meta_data->>'direccion'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_customer();

revoke execute on function public.handle_new_customer() from public, anon, authenticated;

alter table public.customers enable row level security;

revoke all on table public.customers from anon, authenticated;
grant select, update on table public.customers to authenticated;

create policy "own profile"
on public.customers
for select
to authenticated
using (auth.uid() = id or is_admin());

create policy "edit own profile"
on public.customers
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

alter table public.orders
add column customer_id uuid references public.customers(id);

-- Orders: el cliente sólo podrá ver sus propios pedidos; el equipo conserva
-- acceso total. El reemplazo del INSERT público sucede junto al checkout de B.
drop policy if exists select_authenticated on public.orders;
drop policy if exists update_authenticated on public.orders;
drop policy if exists delete_authenticated on public.orders;

create policy "read own or admin"
on public.orders
for select
to authenticated
using (customer_id = auth.uid() or is_admin());

create policy "admin updates"
on public.orders
for update
to authenticated
using (is_admin())
with check (is_admin());

create policy "admin deletes"
on public.orders
for delete
to authenticated
using (is_admin());

-- Products y configuración: estar autenticado ya no alcanza para escribir.
drop policy if exists insert_authenticated on public.products;
drop policy if exists update_authenticated on public.products;
drop policy if exists delete_authenticated on public.products;

create policy "admin writes products i"
on public.products
for insert
to authenticated
with check (is_admin());

create policy "admin writes products u"
on public.products
for update
to authenticated
using (is_admin())
with check (is_admin());

create policy "admin writes products d"
on public.products
for delete
to authenticated
using (is_admin());

drop policy if exists update_authenticated on public.business_config;

create policy "admin updates config"
on public.business_config
for update
to authenticated
using (is_admin())
with check (is_admin());
