-- El cliente ya puede leer únicamente sus pedidos por RLS. Publicarlos permite
-- que el tracker reciba los cambios de estado del panel sin polling.
alter publication supabase_realtime add table public.orders;
