-- Fase F: el precio deja de decidirlo el navegador.
--
-- La policy `create own order` valida que el total sea > 0 y que haya items,
-- pero no que ese total tenga algo que ver con los productos pedidos. Un
-- cliente autenticado puede POSTear directo a PostgREST un pedido de $1.
--
-- Este trigger recalcula la cuenta desde `products` y reescribe la fila. El
-- WITH CHECK de la policy corre DESPUÉS de los triggers BEFORE, así que su
-- `total > 0` termina validando el total del servidor, no el del cliente.

create or replace function public.price_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item          jsonb;
  linea         jsonb;
  producto      public.products%rowtype;
  promo_tipo    text;
  promo_pct     numeric;
  cantidad      integer;
  unitario      numeric;
  subtotal      numeric;
  etiqueta      text;
  total_real    numeric := 0;
  items_reales  jsonb   := '[]'::jsonb;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'El pedido no tiene productos.' using errcode = 'PT003';
  end if;

  -- Un carrito de verdad no pasa de unas pocas decenas de líneas. El tope
  -- existe para que nadie mande diez mil y ponga a la base a recorrerlas.
  if jsonb_array_length(new.items) > 200 then
    raise exception 'El pedido tiene demasiadas líneas.' using errcode = 'PT003';
  end if;

  for item in select * from jsonb_array_elements(new.items)
  loop
    -- Se valida el tipo antes de castear: `(item->>'quantity')::integer` sobre
    -- un `"muchas"` aborta con un error de Postgres crudo en vez del mensaje
    -- que el cliente puede llegar a entender.
    if jsonb_typeof(item->'quantity') <> 'number' then
      raise exception 'Cantidad inválida en el pedido.' using errcode = 'PT003';
    end if;

    cantidad := floor((item->>'quantity')::numeric);

    if cantidad < 1 or cantidad > 999 then
      raise exception 'Cantidad inválida en el pedido.' using errcode = 'PT003';
    end if;

    select * into producto from public.products where id = item->>'productId';

    -- `active` sí, `available` no: "no lo vendo más" invalida el pedido, pero
    -- "hoy se me acabó" lo resuelve el local al preparar, como siempre lo hizo.
    if not found or not producto.active then
      raise exception 'Uno de los productos ya no está disponible.' using errcode = 'PT002';
    end if;

    promo_tipo := producto.promotion->>'type';
    -- Se mira el tipo en vez de castear a ciegas: una fila con `percent` mal
    -- cargado tiene que caer en "sin descuento", no tirar abajo el checkout.
    promo_pct  := case
      when jsonb_typeof(producto.promotion->'percent') = 'number'
        then (producto.promotion->>'percent')::numeric
      else null
    end;

    /*
     * Espejo exacto de `getUnitPrice()`.
     *
     * Las dos decisiones son deliberadas y van juntas:
     *
     * - `double precision` y no `numeric`, porque el front multiplica en
     *   float64. Un producto a $1990 con 17% da 1651,6999… en float y 1651,70
     *   exacto en numeric: mismo redondeo hoy, distinto punto de partida.
     * - `floor(x + 0.5)` y no `round()`, porque `Math.round` desempata hacia
     *   arriba y `round()` sobre double en Postgres desempata al par: con un
     *   resultado terminado en ,5 —1665 con 10% da exactamente 1498,5— el
     *   front cobraría 1499 y la base validaría contra 1498.
     *
     * Cualquiera de las dos por separado deja pedidos legítimos rechazados por
     * un peso de diferencia. Hay una prueba que las compara contra JS.
     */
    if promo_tipo = 'percent' and coalesce(promo_pct, 0) <> 0 then
      unitario := floor(
        producto.price::double precision * (1 - promo_pct::double precision / 100) + 0.5
      )::numeric;
    else
      unitario := producto.price;
    end if;

    -- Espejo de `getLineSubtotal()`: 3x2 y 2x1 no tocan el unitario, cambian
    -- cuántas unidades se cobran. La división entera ya trunca hacia abajo.
    if promo_tipo = '3x2' then
      subtotal := (cantidad - (cantidad / 3)) * producto.price;
    elsif promo_tipo = '2x1' then
      subtotal := (cantidad - (cantidad / 2)) * producto.price;
    else
      subtotal := unitario * cantidad;
    end if;

    -- Espejo de `describePromotion()`. El signo es U+2212, el mismo que usa el
    -- front, para que la etiqueta del panel no cambie de forma según quién la
    -- haya escrito.
    etiqueta := case promo_tipo
      -- El porcentaje se imprime sin decimales cuando es entero: guardado como
      -- 20.0 saldría "−20.0%" y no coincidiría con el badge que ya vio el
      -- cliente en la ficha del producto.
      when 'percent' then '−' || (
        case
          when coalesce(promo_pct, 0) = floor(coalesce(promo_pct, 0))
            then floor(coalesce(promo_pct, 0))::bigint::text
          else promo_pct::text
        end
      ) || '%'
      when '3x2' then '3x2'
      when '2x1' then '2x1'
      else null
    end;

    /*
     * La línea se reescribe entera y no sólo el número.
     *
     * `name` es lo que lee quien arma el pedido en el depósito: si viniera del
     * cliente, se podría pedir el producto barato y hacerle leer al local el
     * nombre del caro. Del carrito sobrevive únicamente la cantidad.
     */
    linea := jsonb_build_object(
      'productId', producto.id,
      'name',      producto.name,
      'unit',      producto.unit,
      'quantity',  cantidad,
      'unitPrice', unitario,
      'subtotal',  subtotal
    );

    if etiqueta is not null then
      linea := linea || jsonb_build_object('promotionLabel', etiqueta);
    end if;

    items_reales := items_reales || jsonb_build_array(linea);
    total_real   := total_real + subtotal;
  end loop;

  /*
   * Reescribir el total alcanzaría para que nadie pague de menos, pero no para
   * que el cobro sea legítimo: al cliente hay que cobrarle lo que aceptó. Si el
   * dueño cambió un precio mientras armaba el carrito, el pedido se rechaza y
   * el front le muestra la cuenta nueva.
   *
   * La tolerancia de un peso cubre cualquier resto de redondeo sin dejar pasar
   * nada real: el fraude que esto ataca es pagar $1 en vez de $8500.
   */
  if new.total is null or abs(new.total - total_real) > 1 then
    raise exception 'Los precios cambiaron mientras armabas el pedido.'
      using errcode = 'PT001';
  end if;

  new.items := items_reales;
  new.total := total_real;

  return new;
end;
$$;

revoke execute on function public.price_order() from public, anon, authenticated;

-- BEFORE INSERT solamente: los pedidos viejos no se tocan, y el UPDATE ya está
-- limitado por RLS a la allowlist de admins, que no edita items ni totales.
create trigger price_order_before_insert
before insert on public.orders
for each row execute function public.price_order();
