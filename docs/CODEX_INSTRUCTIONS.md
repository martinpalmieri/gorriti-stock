# Codex / Agent Instructions

Work incrementally. Do not build the whole app in one task.

This is an internal stock-control app for Gorriti. It is not a SaaS product. Keep the code simple, practical, and maintainable.

## Current implementation status

Implemented:

- Next.js App Router app
- Spanish backoffice UI
- Supabase Auth
- Protected routes
- Supabase schema and RLS
- Real inventory CRUD
- Product creation with initial stock movement
- Product editing with stock read-only
- Manual stock correction through stock movements

In progress / next:

- Real sale confirmation
- Sales history
- CSV export

Core principle:

- Stock must never be changed silently.
- Every stock change must create a `stock_movements` row.

## Required commands

Before finishing every task, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Run e2e only when the task explicitly changes tested flows or asks for it.

Supabase-backed signup from E2E is gated behind `E2E_ALLOW_SUPABASE_SIGNUP=1` and requires `E2E_EMAIL`, `E2E_PASSWORD`, and the public Supabase env vars, with no unsafe repo defaults.

Do not create screenshots by default.

## Do not commit generated artifacts

Never commit:

- `test-results/`
- `playwright-report/`
- `blob-report/`
- `docs/screenshots/`
- `.next/`
- `.env`
- `.env.local`
- trace files
- failure screenshots

Only create screenshots if explicitly requested for a specific visual review task.

## Environment and secrets

Do not commit real environment values.

`.env.example` should contain empty placeholders only:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` must never be imported into client/browser code.

It should only be used by server-only code, currently `lib/supabase/admin.ts`.

For normal authenticated app behavior, use the cookie-aware Supabase server client.

## Auth model

Current MVP auth decision:

- Any authenticated user can manage everything.
- No roles.
- No multi-tenant logic.
- No employees/staff permissions.

Do not add roles or tenant ownership unless explicitly requested.

## Database and migrations

Use migration files in:

```txt
supabase/migrations/
```

Do not make untracked manual schema changes without also updating the migration file.

If a database constraint or schema behavior changes, document it in the migration.

## Stock rules

Product stock is represented by:

- `products.current_stock`
- `stock_movements`

Rules:

- Creating a product creates an `initial` stock movement.
- Editing product metadata must not change stock.
- Manual corrections must create a `manual_correction` stock movement.
- Sales must create `sale` stock movements.
- Stock must never go below zero.
- Direct stock editing in normal product edit forms is forbidden.

Allowed stock movement behavior:

- `initial` can have `quantity_change >= 0`
- non-initial movements must have `quantity_change <> 0`

## Sale confirmation rules

When implementing real sale confirmation:

- Do not trust client-calculated totals.
- Recalculate totals server-side from current product prices.
- Validate product existence.
- Validate product is active.
- Validate requested quantity is available.
- Create:
  - `sales`
  - `sale_items`
  - `stock_movements`
  - updated `products.current_stock`

Prefer a Postgres RPC/function for atomic sale confirmation.

If sequential Supabase writes are used, clearly state that the operation is not strictly atomic.

## UI rules

Use Spanish UI copy.

Keep the UI practical for shop-counter use:

- Fast search
- Clear totals
- Clear stock visibility
- No black-on-black or low-contrast states
- No overdesigned animations

Use simple Tailwind classes.

## Visual style

This app is an internal backoffice for one shop, not a SaaS product.

Prefer:

- simple layouts
- compact spacing
- subtle borders
- small/medium buttons
- readable tables/lists
- boring but clear UI

Avoid:

- large bubbly cards
- oversized buttons
- excessive rounded corners
- heavy shadows
- decorative dashboard styling
- CRM/SaaS-like visual polish

## Next.js note

This project uses a recent Next.js version. Before changing framework-specific behavior, check the installed Next.js docs or existing project patterns.

Avoid fragile Turbopack assumptions. If dev-server behavior becomes unstable, using Webpack for local dev is acceptable.
