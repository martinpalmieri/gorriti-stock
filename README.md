# Gorriti Stock

Internal stock-control app for Gorriti.

This app is used to manage products, stock, manual stock corrections, and shop sales.

It is not a full POS system. Payments are handled manually outside the app for now.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL

## Current features

Implemented:

- Spanish backoffice UI
- Supabase Auth
- Protected routes
- Product inventory
- Product create/edit
- Editable categories from Supabase
- Initial stock movements on product creation
- Manual stock correction through stock movements
- Product detail with stock movement history
- Online/offline status indicator

In progress / upcoming:

- Real sale confirmation
- Sales history
- CSV export
- Offline support later

Not included in MVP:

- SumUp integration
- Payment processing
- Ticket/invoice generation
- Barcode scanning
- Distributor CSV/XLSX import
- Multi-user roles
- Multi-location stock
- Accounting integration

## Install

```bash
npm install
```

## Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- Do not commit `.env.local`.
- Keep `.env.example` with empty placeholders only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client/browser code.

## Run locally

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## E2E

Only run e2e when needed:

```bash
npm run e2e
```

The Playwright dev command sets `PLAYWRIGHT_BYPASS_AUTH=1` for local development only; when `NODE_ENV` is `production`, the app ignores that flag.

By default, tests do not call Supabase `signUp`. To opt in to creating a throwaway test user against a Supabase project (use a dedicated disposable project, never a real production tenant), set:

- `E2E_ALLOW_SUPABASE_SIGNUP=1`
- `E2E_EMAIL` (required when signup is enabled)
- `E2E_PASSWORD` (required; no repository default)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If signup is enabled and any required variable is missing, tests fail early with a message listing what is required.

Do not commit generated Playwright artifacts.

## Supabase

Schema migrations live in:

```txt
supabase/migrations/
```

See:

```txt
docs/SUPABASE_SETUP.md
```

## Stock model

Stock is tracked through:

- `products.current_stock`
- `stock_movements`

Every stock change must create a stock movement.

Normal product editing must not directly change stock.

Stock changes happen through:

- initial stock movement on product creation
- manual stock correction
- sale confirmation
- future restock/import flows

## Auth model

MVP auth is intentionally simple:

- Any authenticated user can manage everything.
- No roles.
- No multi-tenant logic.
