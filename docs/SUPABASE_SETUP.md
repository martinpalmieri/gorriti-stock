# Supabase setup

This project is prepared for Supabase with Next.js App Router server-side auth helpers, but the mocked inventory and sale UI are not wired to Supabase yet.

## Environment variables

Create `.env.local` in the repository root and fill in the values from your Supabase project:

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

## Client helpers

Reusable Supabase helpers live in `lib/supabase/`:

- `client.ts` creates a browser client with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `server.ts` creates a cookie-aware server client for authenticated server-side access.
- `admin.ts` creates a server-only admin client with `SUPABASE_SERVICE_ROLE_KEY`.

## Running the initial migration manually

Until a Supabase CLI workflow is configured, run the initial schema manually:

1. Open the Supabase Dashboard for the project.
2. Go to **SQL Editor**.
3. Open `supabase/migrations/0001_initial_schema.sql` locally.
4. Paste the full migration into the SQL Editor.
5. Run it once against the project database.

The migration creates:

- `categories`
- `products`
- `sales`
- `sale_items`
- `stock_movements`

It also seeds the default Spanish categories and enables Row Level Security.

## MVP auth decision

For the MVP, there are no roles, staff permission levels, or multi-tenant ownership fields.

Any authenticated user can select, insert, update, and delete records in all app tables:

- `categories`
- `products`
- `sales`
- `sale_items`
- `stock_movements`

## Generating database types later

After the Supabase project exists and the CLI can access it, generate TypeScript database types with:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

The checked-in `types/database.types.ts` file is only a placeholder until that command can be run against the real project.
