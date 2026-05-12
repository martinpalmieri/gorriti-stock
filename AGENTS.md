# Agent Rules

This project uses a recent Next.js App Router setup. Some framework behavior may differ from older training data.

Before changing framework-specific code, check the current project patterns and, when needed, the installed Next.js docs under:

```txt
node_modules/next/dist/docs/
```

## Project principles

- Build incrementally.
- Keep implementation simple.
- Do not introduce SaaS or multi-tenant complexity.
- Use Spanish UI copy.
- Do not expose secrets.
- Do not commit generated test artifacts.
- Prioritize reliable stock logic over visual polish.

## Required checks

Before finishing code changes, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Only run e2e when explicitly needed.

Playwright may set `PLAYWRIGHT_BYPASS_AUTH=1` in development; production never treats it as enabled (`lib/playwright-auth-bypass.ts`). E2E flows that call Supabase `signUp` require `E2E_ALLOW_SUPABASE_SIGNUP=1` plus `E2E_PASSWORD` and `E2E_EMAIL` (no repo-default passwords); use only disposable Supabase projects, not real production.

## Do not commit

- `.env.local`
- `.next/`
- `test-results/`
- `playwright-report/`
- `blob-report/`
- `docs/screenshots/`
- Playwright traces
- Failure screenshots

## Auth model

Current MVP auth decision:

- Any authenticated user can manage everything.
- No roles.
- No multi-tenant logic.
- No employee/staff permission system.

Do not add roles or tenant ownership unless explicitly requested.

## Stock rules

Stock must never be changed silently.

Every stock change must create a `stock_movements` row.

Stock changes happen through:

- initial stock movement on product creation
- manual stock correction
- sale confirmation
- future restock/import flows

Normal product editing must not directly change stock.
