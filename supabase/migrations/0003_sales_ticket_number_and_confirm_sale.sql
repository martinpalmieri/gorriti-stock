-- Ticket numbers for factura simplificada + atomic sale confirmation RPC.
--
-- The shop has no real sales yet, so confirm_sale is (re)defined here as the
-- canonical safe sale-confirmation function. The return type gains a
-- ticket_number column, so the old function is dropped first (no historical
-- sale data depends on it).
--
-- Canonical confirm_sale behavior:
--   - accept only payment_method in ('manual_sumup', 'cash')
--   - reject empty/null/non-array carts
--   - reject invalid quantities under 1
--   - aggregate duplicate product ids before stock validation / inserts
--   - lock product rows FOR UPDATE before validating/decrementing stock
--   - price from current products.price (never the client)
--   - reject inactive/missing products
--   - reject insufficient stock with a readable error (name + current stock)
--   - insert sale (status confirmed, payment_method, notes, ticket_number)
--   - insert sale_items with the DB price snapshot
--   - insert stock_movements (type 'sale', negative qty, reason 'Venta')
--   - decrement products.current_stock
--   - assign ticket_number atomically inside the same transaction
--   - roll back atomically on any raised exception
--   - return sale_id, total_amount, item_count, ticket_number

create sequence if not exists public.sale_ticket_seq start 1;

alter table public.sales
  add column if not exists ticket_number text;

create unique index if not exists sales_ticket_number_idx
  on public.sales (ticket_number)
  where ticket_number is not null;

-- Backfill legacy sales with stable ticket numbers based on creation order.
with numbered as (
  select
    id,
    'GS-' || extract(year from created_at)::text || '-' ||
      lpad(row_number() over (
        partition by extract(year from created_at)
        order by created_at, id
      )::text, 6, '0') as generated_ticket_number
  from public.sales
  where ticket_number is null
)
update public.sales s
set ticket_number = n.generated_ticket_number
from numbered n
where s.id = n.id;

-- Advance the sequence past any backfilled rows for the current year.
-- When there are no sales yet, leave the sequence so the next value is 1
-- (setval cannot accept 0, and is_called=false makes nextval return the value).
with last_seq as (
  select max(
    regexp_replace(ticket_number, '^GS-[0-9]{4}-', '')::bigint
  ) as max_seq
  from public.sales
  where ticket_number like 'GS-' || extract(year from now())::text || '-%'
)
select setval(
  'public.sale_ticket_seq',
  greatest(coalesce(max_seq, 0), 1),
  coalesce(max_seq, 0) > 0
)
from last_seq;

drop function if exists public.confirm_sale(jsonb, text, text);

create function public.confirm_sale(
  items jsonb,
  notes text default null,
  payment_method text default 'manual_sumup'
)
returns table (
  sale_id uuid,
  total_amount numeric,
  item_count integer,
  ticket_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total numeric(10, 2) := 0;
  v_item_count integer := 0;
  v_ticket_number text;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product_name text;
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_stock_before integer;
  v_stock_after integer;
  v_year integer;
  v_seq bigint;
begin
  if payment_method is null or payment_method not in ('manual_sumup', 'cash') then
    raise exception 'El método de pago no es válido.';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'El carrito no puede estar vacío.';
  end if;

  -- Validate every raw cart line before aggregating duplicates.
  for v_item in
    select value
    from jsonb_array_elements(items)
  loop
    if nullif(v_item->>'product_id', '') is null then
      raise exception 'No se encontró el producto.';
    end if;

    if (v_item->>'quantity') is null
      or (v_item->>'quantity') !~ '^-?[0-9]+$'
      or (v_item->>'quantity')::integer < 1
    then
      raise exception 'La cantidad debe ser al menos 1.';
    end if;
  end loop;

  v_year := extract(year from now())::integer;
  v_seq := nextval('public.sale_ticket_seq');
  v_ticket_number := 'GS-' || v_year::text || '-' || lpad(v_seq::text, 6, '0');

  insert into public.sales (total_amount, status, payment_method, notes, ticket_number)
  values (0, 'confirmed', payment_method, notes, v_ticket_number)
  returning id into v_sale_id;

  -- Aggregate duplicate product ids so each product is validated and
  -- decremented once with its combined quantity.
  for v_product_id, v_quantity in
    select
      (value->>'product_id')::uuid as product_id,
      sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(items) as value
    group by (value->>'product_id')::uuid
  loop
    select p.name, p.price, p.current_stock
    into v_product_name, v_unit_price, v_stock_before
    from public.products as p
    where p.id = v_product_id
      and coalesce(p.is_active, true) = true
    for update;

    if not found then
      raise exception 'El producto no existe o no está activo.';
    end if;

    if v_stock_before < v_quantity then
      raise exception 'No hay suficiente stock para "%". Stock actual: %',
        v_product_name, v_stock_before;
    end if;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_total := v_total + v_line_total;
    v_item_count := v_item_count + v_quantity;

    insert into public.sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      total_price
    )
    values (
      v_sale_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_line_total
    );

    v_stock_after := v_stock_before - v_quantity;

    update public.products
    set current_stock = v_stock_after
    where id = v_product_id;

    insert into public.stock_movements (
      product_id,
      type,
      quantity_change,
      stock_before,
      stock_after,
      sale_id,
      reason
    )
    values (
      v_product_id,
      'sale',
      -v_quantity,
      v_stock_before,
      v_stock_after,
      v_sale_id,
      'Venta'
    );
  end loop;

  update public.sales
  set total_amount = v_total
  where id = v_sale_id;

  return query
  select v_sale_id, v_total, v_item_count, v_ticket_number;
end;
$$;

grant usage on sequence public.sale_ticket_seq to authenticated;
grant execute on function public.confirm_sale(jsonb, text, text) to authenticated;
