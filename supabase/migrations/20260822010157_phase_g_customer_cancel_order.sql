-- Fase G: el cliente puede cancelar su propio pedido.
--
-- Va como RPC y no como policy de UPDATE a propósito. Abrir el UPDATE de
-- `orders` a los clientes obligaría a defender columna por columna —nada
-- impide en una policy que el mismo UPDATE que cambia el estado toque el
-- total o los items— y los permisos por columna alcanzarían también a los
-- admins, que sí necesitan editar pago y notas. Con `security definer` la
-- regla queda en un solo lugar y la tabla no se toca.

create or replace function public.cancel_order(p_order_id text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido public.orders%rowtype;
begin
  -- `for update` traba la fila: si el dueño está pasando el pedido a
  -- "preparando" en ese mismo instante, uno de los dos espera al otro en vez
  -- de que queden un pedido cancelado y una bolsa ya armada.
  select * into pedido
  from public.orders
  where id = p_order_id
  for update;

  /*
   * Un pedido ajeno y uno inexistente contestan igual: si dijeran cosas
   * distintas, probando ids se podría averiguar cuáles existen.
   *
   * Los dos `is null` no sobran. `null is distinct from null` es FALSO, así
   * que sin ellos una llamada sin sesión pasaba el control sobre los pedidos
   * legacy, que no tienen `customer_id`. El `grant` a `authenticated` ya lo
   * hacía inalcanzable desde PostgREST, pero la función no puede depender de
   * quién la tenga permitida para decidir de quién es un pedido.
   */
  if not found
    or auth.uid() is null
    or pedido.customer_id is null
    or pedido.customer_id <> auth.uid()
  then
    raise exception 'No encontramos ese pedido en tu cuenta.' using errcode = 'PT005';
  end if;

  -- Idempotente: volver atrás y apretar de nuevo no es un error que valga la
  -- pena mostrarle a nadie.
  if pedido.status = 'cancelado' then
    return pedido;
  end if;

  /*
   * Sólo antes de que lo agarren.
   *
   * Una vez que el local puso "preparando" ya hay alguien juntando los
   * productos: cancelar de un botón le deja la bolsa armada sin avisar. Desde
   * ahí en adelante la salida es el chat del pedido, que existe justamente
   * para eso.
   */
  if pedido.status not in ('nuevo', 'sin_confirmar') then
    raise exception 'El pedido ya está en preparación.' using errcode = 'PT004';
  end if;

  update public.orders
  set
    status = 'cancelado',
    history = coalesce(history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', 'cancelado',
        -- Mismo formato que `new Date().toISOString()`, que es lo que escribe
        -- el panel: el historial lo lee un solo componente para los dos.
        'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    )
  where id = p_order_id
  returning * into pedido;

  return pedido;
end;
$$;

revoke execute on function public.cancel_order(text) from public, anon;
grant execute on function public.cancel_order(text) to authenticated;
