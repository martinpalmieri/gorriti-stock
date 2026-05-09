-- Permit an initial stock movement with quantity_change = 0 so products can be
-- created with valid zero initial stock while still recording the initial state.
-- Non-initial stock movements must still have a non-zero quantity_change.

alter table public.stock_movements
  drop constraint if exists stock_movements_quantity_change_nonzero;

alter table public.stock_movements
  drop constraint if exists stock_movements_quantity_change_allowed;

alter table public.stock_movements
  add constraint stock_movements_quantity_change_allowed check (
    (type = 'initial' and quantity_change >= 0)
    or
    (type <> 'initial' and quantity_change <> 0)
  );