# Supabase Setup

This project uses Supabase for:

- Authentication
- PostgreSQL database
- Row Level Security
- Product inventory
- Stock movements
- Sales data

## Environment variables

Create `.env.local` in the repository root:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- `.env.local` is local-only and must not be committed.
- Keep `.env.example` committed with empty placeholders only.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for browser Supabase clients.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be imported or exposed in client/browser code.

The project URL should be the base Supabase URL, without `/rest/v1/`.

Correct:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
```

Wrong:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co/rest/v1/
```

## Client helpers

Reusable Supabase helpers live in:

```txt
lib/supabase/
```

Files:

- `client.ts` creates a browser client with public env vars.
- `server.ts` creates a cookie-aware server client for authenticated server-side access.
- `admin.ts` creates a server-only admin client with `SUPABASE_SERVICE_ROLE_KEY`.

Do not import `admin.ts` into client components.

## Migrations

Migration files live in:

```txt
supabase/migrations/
```

Run migrations manually through Supabase SQL Editor until a CLI workflow is configured.

Current migrations include:

- `0001_initial_schema.sql`
- `0002_allow_zero_initial_stock_movement.sql`

The schema includes:

- `categories`
- `products`
- `sales`
- `sale_items`
- `stock_movements`

## Manual migration process

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Open the migration file locally.
4. Paste the migration SQL.
5. Run it once against the project database.
6. Verify the expected tables/constraints exist.

## Default categories

The initial migration seeds:

- Libros
- Discos / Música
- Papelería
- Prints
- Publicación propia
- Otros

## MVP auth decision

For the MVP:

- Any authenticated user can manage everything.
- No roles.
- No employee permissions.
- No multi-tenant ownership fields.

Authenticated users can select, insert, update, and delete records in:

- `categories`
- `products`
- `sales`
- `sale_items`
- `stock_movements`

## Stock movement constraints

Stock changes must be recorded in `stock_movements`.

Important rule:

```txt
initial movements: quantity_change >= 0
non-initial movements: quantity_change <> 0
```

Stock must not go below zero.

## Generating database types

After the Supabase project exists and the CLI can access it:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

The checked-in `types/database.types.ts` may be manually maintained until this command is run against the real project.
