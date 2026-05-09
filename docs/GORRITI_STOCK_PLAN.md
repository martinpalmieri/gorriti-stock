# Gorriti Stock - MVP Plan

## Goal

Build a simple internal stock-control web app for Gorriti, a small curated book / record / stationery / art shop.

The app is not a full POS system. For the MVP, payments happen manually in SumUp or another payment terminal. This app is used to track products, create sales, and update stock.

The app should be simple, fast, and practical for use at the shop counter.

---

## Context

Gorriti will sell products such as:

- Books
- Records / music
- Stationery
- Prints
- Own products
- Other future categories

The initial categories are books, records/music, and stationery, but categories must be editable because the shop inventory can grow quickly.

The app will be used by only two people, on one dedicated shop computer, most likely a laptop or Mac mini.

The UI should be in Spanish.

---

## Current Status

Already implemented:

- Next.js App Router project
- Spanish app shell
- Supabase Auth
- Protected app routes
- Supabase schema and RLS
- Product inventory connected to Supabase
- Product create/edit
- Initial stock movement on product creation
- Manual stock correction
- Stock movement history in product detail
- Online/offline status indicator

In progress / next:

- Real sale confirmation using Supabase products
- Sales history
- CSV export

Still future / non-MVP:

- SumUp integration
- Barcode scanner integration
- Distributor CSV/XLSX imports
- Offline sale queue and sync
- Advanced stats
- Multi-user roles

---

## Tech Stack

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Vercel, if deployment is needed

Preferred structure:

- App Router
- Server actions or API routes where appropriate
- Supabase client/server setup
- TypeScript types generated from Supabase once schema exists

Avoid overengineering.

---

## Product Philosophy

This is a small-shop backoffice tool, not a SaaS product.

Prioritize:

- Speed of use
- Simple product search
- Reliable stock updates
- Clear sale flow
- Easy manual corrections
- CSV export
- Future offline support

Do not prioritize:

- Advanced dashboards
- Beautiful animations
- Multi-tenant support
- Employee management
- Complex supplier CRM
- Full accounting
- Native POS functionality

---

# MVP Scope

## MVP Features

The MVP must include:

1. Product management
2. Editable categories
3. Stock tracking
4. Stock movements
5. Simple sale/cart flow
6. Manual stock corrections
7. Fast search/filtering
8. CSV export
9. Supabase Auth
10. Spanish UI

---

# Non-MVP Scope

Do not implement in the MVP:

- SumUp integration
- Payment processing
- Ticket/invoice generation
- Barcode scanning
- Importing distributor Excel/CSV files
- Advanced stats
- Supplier management / CRM
- Multi-location inventory
- Employee roles
- Complex offline sync
- Purchase order management
- Accounting integration

However, the architecture should not block these later.

---

# Offline Mode Strategy

Offline mode is important for the shop in the future.

If internet goes down, the shop should eventually be able to continue recording sales locally and sync them later.

Full offline sync is not required for the MVP.

## MVP Requirement

For MVP:

- App is online-first.
- Supabase is the source of truth.
- Show a visible online/offline status indicator.
- Do not pretend offline mode works if it does not.
- Structure stock updates as stock movements so future offline replay is easier.

## Future Offline Mode

Later phase:

- Use IndexedDB for local storage.
- When offline, allow creating pending sales locally.
- Store sales and stock movements in an offline queue.
- When internet returns, sync queued sales to Supabase.
- Show clear sync status:
  - Synced
  - Pending sync
  - Sync failed
- Avoid duplicate sales by using client-generated UUIDs.
- Resolve conflicts carefully.

Important: do not build a fragile partial offline mode in MVP.

---

# Core User Flows

## 1. Add Product

User can create a product with:

- Name / title
- Category
- Creator / author / artist
- Brand / publisher / label
- Price
- Cost price
- Initial stock quantity
- Condition
- Supplier
- Barcode
- SKU
- ISBN
- Notes

Only these fields should be required:

- Name / title
- Category
- Price
- Initial stock quantity

Everything else can be optional.

When the product is created, the app must also create an initial stock movement.

Example:

```txt
Product: El Aleph
Initial stock: 1

Stock movement:
type: initial
quantity_change: +1
reason: Stock inicial
```

---

## 2. Search Product

User must be able to quickly search products while a customer is waiting.

Search should match:

- Product name/title
- Author / artist / creator
- Publisher / label / brand
- Barcode
- SKU
- ISBN
- Notes, optional

Filters:

- Category
- Condition
- In stock / out of stock

Search UX should be fast and keyboard-friendly.

---

## 3. Create Sale

Sale flow:

1. User clicks "Nueva venta".
2. User searches for a product.
3. User adds product to the sale.
4. User can add multiple products.
5. App shows sale total.
6. User charges the customer manually using SumUp terminal.
7. After payment succeeds, user clicks "Confirmar venta".
8. App records the sale.
9. App creates sale items.
10. App creates stock movements.
11. App reduces product stock.

Example:

```txt
New sale:
- Book A: €20
- Notebook B: €8
- Record C: €17

Total: €45

User enters €45 manually in SumUp.
Customer pays.
User clicks Confirmar venta.
Stock updates.
```

No payment integration in MVP.

---

## 4. Cancel Sale Before Confirmation

Before confirming a sale, user should be able to:

- Remove an item
- Change quantity
- Cancel sale

No stock should change until the sale is confirmed.

---

## 5. Manual Stock Correction

User must be able to manually adjust stock.

Examples:

- Product was lost
- Product was damaged
- Product was counted incorrectly
- Product was returned
- Initial stock was wrong
- New stock arrived manually

Manual correction must create a stock movement.

Example:

```txt
Current stock: 1
Correction: -1
Reason: Damaged item
New stock: 0
```

Do not directly mutate stock without recording a movement.

---

## 6. Export CSV

User should be able to export:

1. Products CSV
2. Stock movements CSV
3. Sales CSV

At minimum, export products for MVP.

CSV export is important to avoid lock-in.

---

# Data Model

Use a generic product model. Do not create separate tables for books, records, stationery, etc.

Categories are editable.

## Tables

Main tables:

- categories
- products
- stock_movements
- sales
- sale_items

---

## categories

Fields:

```sql
id uuid primary key default gen_random_uuid()
name text not null
slug text unique not null
created_at timestamptz default now()
updated_at timestamptz default now()
```

Current Spanish categories:

```txt
Libros
Discos / Música
Papelería
Prints
Publicación propia
Otros
```

---

## products

Fields:

```sql
id uuid primary key default gen_random_uuid()

name text not null

category_id uuid references categories(id)

creator_or_author text
brand_publisher_label text

price numeric(10,2) not null
cost_price numeric(10,2)

current_stock integer not null default 0

condition text

supplier text

barcode text
sku text
isbn text

notes text

extra_fields jsonb default '{}'::jsonb

is_active boolean default true

created_at timestamptz default now()
updated_at timestamptz default now()
```

Notes:

- `name` is used for product name/title.
- `creator_or_author` can be author, artist, illustrator, etc.
- `brand_publisher_label` can be publisher, label, brand, etc.
- `condition` is optional.
- `supplier` is simple text for MVP, not a full supplier table.
- `extra_fields` exists for future flexibility but does not need UI in MVP.
- `is_active` allows hiding discontinued/sold products without deleting them.

Recommended condition values:

```txt
new
used_very_good
used_good
```

Spanish labels:

```txt
Nuevo
Usado - muy bueno
Usado - bueno
```

---

## stock_movements

Fields:

```sql
id uuid primary key default gen_random_uuid()

product_id uuid not null references products(id)

type text not null

quantity_change integer not null

stock_before integer not null
stock_after integer not null

sale_id uuid references sales(id)

reason text

created_at timestamptz default now()
created_by uuid
```

Movement types:

```txt
initial
sale
manual_correction
restock
return
```

Rules:

- Positive quantity means stock increased.
- Negative quantity means stock decreased.
- Every stock change must create a stock movement.
- `products.current_stock` should be updated together with the movement.
- `initial` movements can have `quantity_change >= 0`.
- Non-initial movements must have `quantity_change <> 0`.
- Stock must never go below zero.

---

## sales

Fields:

```sql
id uuid primary key default gen_random_uuid()

total_amount numeric(10,2) not null
status text not null default 'confirmed'

payment_method text default 'manual_sumup'

notes text

created_at timestamptz default now()
created_by uuid
```

Sale status:

```txt
confirmed
cancelled
```

For MVP, sales are only created once confirmed.

Payment method options:

```txt
manual_sumup
cash
other
```

---

## sale_items

Fields:

```sql
id uuid primary key default gen_random_uuid()

sale_id uuid not null references sales(id)
product_id uuid not null references products(id)

quantity integer not null
unit_price numeric(10,2) not null
total_price numeric(10,2) not null

created_at timestamptz default now()
```

---

# Stock Update Rules

Stock updates must be safe.

When confirming a sale:

1. Start a transaction or use a Postgres RPC.
2. Validate the sale.
3. Create sale.
4. Create sale items.
5. For each sale item:
   - Check current stock.
   - Prevent stock from going below zero.
   - Insert stock movement.
   - Update product current stock.
6. Commit transaction.

If any product does not have enough stock, fail the whole sale and show a useful error.

Example error:

```txt
No hay suficiente stock para "El Aleph".
Stock actual: 0
```

---

# Search Requirements

Product search must be good enough for real shop use.

Minimum behavior:

- Search input at top of inventory page.
- Search input inside sale flow.
- Debounced search where useful.
- Case-insensitive search.
- Match partial text.
- Search across:
  - name
  - creator_or_author
  - brand_publisher_label
  - barcode
  - sku
  - isbn

Suggested implementation:

- Start with simple Supabase/Postgres `ilike`.
- Later improve with full-text search if needed.

---

# UI Pages

## 1. Dashboard / Home

Simple overview:

- Products in stock count
- Out-of-stock count
- Sales today
- Revenue today
- Button: Nueva venta
- Button: Añadir producto
- Button: Ver inventario

Keep it simple.

---

## 2. Products / Inventory

Spanish title:

```txt
Inventario
```

Features:

- Product table/list
- Search
- Filter by category
- Filter by condition
- Filter in stock/out of stock
- Add product button
- Edit product button
- View product detail
- Manual stock correction
- Stock movement history

Columns:

- Name/title
- Category
- Author/artist/creator
- Publisher/label/brand
- Price
- Cost price
- Stock
- Condition

For small stock quantities, stock should be visually clear.

---

## 3. Product Detail

Shows:

- Product info
- Current stock
- Stock movement history
- Edit product button
- Manual stock correction button

---

## 4. Add/Edit Product

Form fields:

Required:

- Name/title
- Category
- Price
- Initial stock, only when creating

Optional:

- Creator/author/artist
- Brand/publisher/label
- Cost price
- Condition
- Supplier
- Barcode
- SKU
- ISBN
- Notes

When editing an existing product:

- Do not directly edit current stock in the normal edit form.
- Stock changes must happen through manual stock correction.

---

## 5. New Sale

Spanish title:

```txt
Nueva venta
```

Flow:

- Search product
- Add product to cart
- Cart list
- Quantity controls
- Total amount
- Payment method selector:
  - Tarjeta / SumUp
  - Efectivo
- Confirm sale button
- Cancel sale button

Important:

- Stock is not updated until confirm.
- If quantity exceeds available stock, show warning.
- Confirm button should be disabled if cart is empty.
- Sale total must be calculated server-side on confirmation.

After confirming sale:

- Show success state.
- Show total.
- Option to start another sale.
- Option to view sale details.

---

## 6. Sales History

Spanish title:

```txt
Ventas
```

Features:

- List sales by date
- Show total amount
- Show payment method
- Show number of items
- Click sale to see details

No advanced stats needed.

---

## 7. Settings

Spanish title:

```txt
Configuración
```

MVP settings:

- Manage categories
- Export CSV

Optional:

- Shop name
- Currency default: EUR

---

# Authentication

Use Supabase Auth with email/password.

Current MVP auth decision:

- Any authenticated user can manage everything.
- No roles.
- No multi-tenant logic.
- No employees/staff permissions.

Do not build complex role permissions.

---

# RLS / Security

RLS is enabled.

For MVP:

- Any authenticated user can read/write app data.
- No multi-tenant logic.

Relevant tables:

- categories
- products
- stock_movements
- sales
- sale_items

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client/browser code.

---

# Spanish UI Copy

Use Spanish UI labels.

Examples:

```txt
Inventario
Productos
Añadir producto
Editar producto
Nueva venta
Confirmar venta
Cancelar
Stock actual
Corregir stock
Corrección de stock
Historial de movimientos
Ventas
Configuración
Categorías
Exportar CSV
Precio
Coste
Proveedor
Estado
Notas
Buscar producto
Sin stock
En stock
```

Use clear neutral Spanish. No need for formal enterprise language.

---

# Currency

Use EUR.

Display prices as:

```txt
€20,00
```

Internally store numeric values using `numeric(10,2)`.

---

# CSV Export

Implement at least product CSV export.

## Product Export Columns

```csv
id
name
category
creator_or_author
brand_publisher_label
price
cost_price
current_stock
condition
supplier
barcode
sku
isbn
notes
created_at
updated_at
```

Later exports:

- Stock movements
- Sales
- Sale items

---

# Future Import Support

Do not implement import in MVP, but keep structure ready for it.

Future import needs:

- Upload CSV/XLSX from distributor
- Map columns manually
- Preview before import
- Create products
- Update stock
- Create stock movements
- Detect duplicates by ISBN/barcode/SKU/name

This is not part of MVP.

---

# Future Barcode Support

Do not implement barcode scanner integration in MVP.

But keep fields:

- barcode
- isbn
- sku

Future behavior:

- Search input can accept barcode scanner keyboard input.
- If scanner sends barcode + Enter, app finds product and adds it to sale.
- For own products without barcode, manually search by name.

---

# Future SumUp Integration

Do not implement SumUp integration in MVP.

MVP flow:

- App shows total.
- User manually enters total in SumUp terminal.
- Customer pays.
- User clicks confirm sale.

Future integration:

- Create checkout/payment request from app.
- Detect payment success.
- Confirm sale automatically.
- Update stock automatically.
- Possibly print/email ticket through SumUp or another system.

Until then, use manual SumUp terminal flow.

---

# Future Stats

Not MVP.

Possible later stats:

- Daily sales
- Monthly revenue
- Best-selling categories
- Margin per product/category
- Stock value
- Cost value
- Sold-out products
- Average ticket size

Because stock movements and sales are stored from day one, these stats will be possible later.

---

# MVP Acceptance Criteria

The MVP is done when:

1. User can create/edit products.
2. User can create/edit categories.
3. User can search products quickly.
4. User can create a sale with multiple products.
5. Sale total is shown correctly.
6. User can confirm sale manually after charging externally.
7. Stock decreases correctly after confirmed sale.
8. Every stock change creates a stock movement.
9. User can manually correct stock.
10. User can view product stock history.
11. User can view sales history.
12. User can export products as CSV.
13. App UI is in Spanish.
14. App shows online/offline status.
15. App does not implement payment integration yet.
16. App does not implement full offline sync yet.

---

# Testing Checklist

## Product Tests

- Create book with author, publisher, ISBN.
- Create record with artist, label.
- Create stationery product with brand.
- Create print without barcode/SKU.
- Create product with stock 0.
- Edit product price.
- Edit product notes.
- Confirm stock is read-only in edit form.
- Search by title.
- Search by author.
- Search by publisher/label/brand.
- Search by ISBN.
- Search by partial text.

## Stock Tests

- Create product with stock 1.
- Confirm initial stock movement exists.
- Correct stock +1.
- Correct stock -1.
- Try to correct stock below 0.
- Confirm correction creates stock movement.
- View movement history.

## Sale Tests

- Sell one product.
- Sell multiple products.
- Try to sell out-of-stock product.
- Try to sell quantity greater than stock.
- Cancel sale before confirming.
- Confirm sale and verify stock movement.
- Verify sale total.
- Verify sale history.

## CSV Tests

- Export products.
- Open CSV in spreadsheet software.
- Confirm fields are correct.

## Offline Status Tests

- Disconnect internet.
- App shows offline warning.
- App does not silently lose actions.
- Reconnect internet.
- App shows online again.

---

# Future Phase 2 - Offline Mode

After MVP, implement real offline mode.

Plan:

1. Add IndexedDB using Dexie or similar.
2. Cache products locally.
3. Cache categories locally.
4. Allow offline sale creation.
5. Store pending sales in local queue.
6. Use client-generated UUIDs for sales.
7. When online, sync pending sales.
8. Server validates stock.
9. If sync succeeds, mark sale as synced.
10. If sync fails, show clear error and allow manual resolution.

Important conflict case:

```txt
Product had stock 1.
Offline sale sells it.
Another device online also sells it.
When offline sale syncs, stock is no longer available.
```

For MVP future assumption, because only one shop computer is used, conflict risk is low. Still, the sync system should not blindly overwrite server stock.

---

# Future Phase 3 - Import CSV/XLSX

Later:

1. Upload distributor file.
2. Preview rows.
3. Map columns:
   - title/name
   - author/artist
   - publisher/label
   - price
   - cost price
   - ISBN/barcode
   - quantity
4. Detect duplicates.
5. Let user choose:
   - create new product
   - update existing product
   - skip row
6. Apply import.
7. Create stock movements for imported stock.

---

# Future Phase 4 - Barcode Scanning

Later:

1. Add barcode scanner support through focused search input.
2. Scanner acts like keyboard input.
3. Barcode + Enter finds product.
4. In sale flow, barcode scan adds product to cart.
5. In product form, barcode scan fills barcode field.

---

# Future Phase 5 - SumUp or POS Integration

Later:

1. Research SumUp API availability for Spain.
2. Check if SumUp allows:
   - creating payments from external app
   - receiving payment confirmation
   - syncing catalog/products
   - syncing inventory
3. If possible:
   - create payment request from sale
   - wait for payment success
   - auto-confirm sale
   - update stock

Until then, use manual SumUp terminal flow.

---

# Current Remaining MVP Priorities

1. Real sale confirmation
2. Sales history using real sales data
3. CSV export
4. Basic settings/category management if not complete
5. Manual polish and reliability fixes

Keep the code simple and maintainable.

Use Spanish UI text.

Prioritize correctness of stock updates over visual polish.
