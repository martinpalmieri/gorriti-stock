-- Initial Gorriti Stock schema.
-- Auth decision for MVP: any authenticated user can manage all app tables.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id),
  creator_or_author text,
  brand_publisher_label text,
  price numeric(10,2) not null,
  cost_price numeric(10,2),
  current_stock integer not null default 0,
  condition text,
  supplier text,
  barcode text,
  sku text,
  isbn text,
  notes text,
  extra_fields jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint products_price_nonnegative check (price >= 0),
  constraint products_cost_price_nonnegative check (cost_price is null or cost_price >= 0),
  constraint products_current_stock_nonnegative check (current_stock >= 0),
  constraint products_condition_allowed check (
    condition is null
    or condition in ('new', 'used_very_good', 'used_good')
  )
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  total_amount numeric(10,2) not null,
  status text not null default 'confirmed',
  payment_method text default 'manual_sumup',
  notes text,
  created_at timestamptz default now(),
  created_by uuid,
  constraint sales_total_amount_nonnegative check (total_amount >= 0),
  constraint sales_status_allowed check (status in ('confirmed', 'cancelled')),
  constraint sales_payment_method_allowed check (
    payment_method is null
    or payment_method in ('manual_sumup', 'cash', 'other')
  )
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  product_id uuid not null references public.products(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  created_at timestamptz default now(),
  constraint sale_items_quantity_positive check (quantity > 0),
  constraint sale_items_unit_price_nonnegative check (unit_price >= 0),
  constraint sale_items_total_price_nonnegative check (total_price >= 0)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  type text not null,
  quantity_change integer not null,
  stock_before integer not null,
  stock_after integer not null,
  sale_id uuid references public.sales(id),
  reason text,
  created_at timestamptz default now(),
  created_by uuid,
  constraint stock_movements_type_allowed check (
    type in ('initial', 'sale', 'manual_correction', 'restock', 'return')
  ),
  constraint stock_movements_quantity_change_nonzero check (quantity_change <> 0),
  constraint stock_movements_stock_before_nonnegative check (stock_before >= 0),
  constraint stock_movements_stock_after_nonnegative check (stock_after >= 0)
);

create index products_category_id_idx on public.products(category_id);
create index products_name_idx on public.products(name);
create index products_creator_or_author_idx on public.products(creator_or_author);
create index products_brand_publisher_label_idx on public.products(brand_publisher_label);
create index products_barcode_idx on public.products(barcode);
create index products_sku_idx on public.products(sku);
create index products_isbn_idx on public.products(isbn);
create index stock_movements_product_id_idx on public.stock_movements(product_id);
create index stock_movements_sale_id_idx on public.stock_movements(sale_id);
create index sale_items_sale_id_idx on public.sale_items(sale_id);
create index sale_items_product_id_idx on public.sale_items(product_id);
create index sales_created_at_idx on public.sales(created_at);

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

insert into public.categories (name, slug)
values
  ('Libros', 'libros'),
  ('Discos / Música', 'discos-musica'),
  ('Papelería', 'papeleria'),
  ('Prints', 'prints'),
  ('Publicación propia', 'publicacion-propia'),
  ('Otros', 'otros')
on conflict (slug) do nothing;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

create policy "Authenticated users can select categories"
  on public.categories for select to authenticated using (true);
create policy "Authenticated users can insert categories"
  on public.categories for insert to authenticated with check (true);
create policy "Authenticated users can update categories"
  on public.categories for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete categories"
  on public.categories for delete to authenticated using (true);

create policy "Authenticated users can select products"
  on public.products for select to authenticated using (true);
create policy "Authenticated users can insert products"
  on public.products for insert to authenticated with check (true);
create policy "Authenticated users can update products"
  on public.products for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete products"
  on public.products for delete to authenticated using (true);

create policy "Authenticated users can select sales"
  on public.sales for select to authenticated using (true);
create policy "Authenticated users can insert sales"
  on public.sales for insert to authenticated with check (true);
create policy "Authenticated users can update sales"
  on public.sales for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete sales"
  on public.sales for delete to authenticated using (true);

create policy "Authenticated users can select sale_items"
  on public.sale_items for select to authenticated using (true);
create policy "Authenticated users can insert sale_items"
  on public.sale_items for insert to authenticated with check (true);
create policy "Authenticated users can update sale_items"
  on public.sale_items for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete sale_items"
  on public.sale_items for delete to authenticated using (true);

create policy "Authenticated users can select stock_movements"
  on public.stock_movements for select to authenticated using (true);
create policy "Authenticated users can insert stock_movements"
  on public.stock_movements for insert to authenticated with check (true);
create policy "Authenticated users can update stock_movements"
  on public.stock_movements for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete stock_movements"
  on public.stock_movements for delete to authenticated using (true);
