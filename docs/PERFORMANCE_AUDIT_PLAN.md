# Production Performance Audit

## Observed problem

Navigation feels slow on the deployed Vercel app (`https://stock.gorriti.eu`), not only in local development.

## What was measured

### Routes in scope

- `/`
- `/inventory`
- `/sales/new`
- `/sales`
- `/settings`
- `/login`

### Code-path audit completed

- Protected navigation currently runs auth in [`app/(protected)/layout.tsx`](app/(protected)/layout.tsx) with:
  - `createClient()`
  - `supabase.auth.getUser()`
- This means auth can run on every protected route transition.
- Route loaders inspected:
  - [`lib/dashboard/load-dashboard.ts`](lib/dashboard/load-dashboard.ts)
  - [`lib/inventory/data.ts`](lib/inventory/data.ts)
  - [`app/(protected)/sales/page.tsx`](app/(protected)/sales/page.tsx)
  - [`app/(protected)/sales/new/actions.ts`](app/(protected)/sales/new/actions.ts)
  - [`app/(protected)/settings/categories-section.tsx`](app/(protected)/settings/categories-section.tsx)
- Query-shape observations:
  - Dashboard and inventory loaders already use `Promise.all` for key independent queries.
  - Sales page still does sequential work (list query, then initial detail query).

### Optional production timing instrumentation added

Server-side timing logs are now available behind an env flag:

- `ENABLE_PERF_LOGS=1`

When enabled, the app logs only minimal, non-sensitive timing data:

- `[perf][layout] createClient=...ms`
- `[perf][layout] getUser=...ms`
- `[perf][dashboard] queries=...ms`
- `[perf][inventory] queries=...ms`
- `[perf][sales] list=...ms`
- `[perf][sales] firstDetail=...ms`
- `[perf][sales-new] products=...ms`
- `[perf][settings] categories=...ms`

No user emails, secrets, or query payloads are logged.

### Runtime numbers still required

To complete evidence from production, run with `ENABLE_PERF_LOGS=1` on Vercel and capture timings per route from function logs.

## Likely bottlenecks

Ranked by current evidence:

1. **Auth round-trip on protected navigation (`getUser`)**
   - Evidence: protected layout calls `supabase.auth.getUser()` before rendering children.
   - Impact: adds at least one Supabase Auth network hop for each protected route render.

2. **Vercel region and Supabase region latency**
   - Evidence: likely in production when all requests depend on Supabase network hops; cannot be confirmed from code alone.
   - Required check: compare Vercel Functions region vs Supabase project region.

3. **Sequential server work on `/sales`**
   - Evidence: sales list query resolves first, then `getSaleDetail` for first row runs.
   - Impact: additional round-trip before full page payload is ready.

4. **Large client components (lower confidence for this issue)**
   - Evidence: `product-list.tsx` and `new-sale-layout.tsx` are large.
   - Likely impact: first-load JS/bundle cost more than server-navigation bottlenecks.

## Immediate fixes

Small, safe actions to do first:

1. Keep `ENABLE_PERF_LOGS` instrumentation temporarily and gather real production timings.
2. Confirm Vercel Functions region and Supabase region; align regions if mismatched.
3. Use captured timings to identify whether auth, queries, or route-specific loaders are dominant.
4. Keep current sequential `/sales` behavior under observation; change only if logs show it as meaningful bottleneck.

## Medium fixes

Changes that require care after measurements:

1. **Auth gate optimization in protected layout**
   - Evaluate replacing layout-level `getUser()` with `getSession()` only for redirect gating.
   - Keep security trade-off explicit in code/docs.

2. **Sales route data strategy**
   - Defer first-detail query or load it on demand after list paint.
   - Preserve UX behavior and avoid regressions in detail panel.

3. **Query trimming where needed**
   - Select only required columns on heavy routes if logs show material query time.
   - Add limits where payload growth becomes measurable.

4. **Perceived performance improvements**
   - Add `loading.tsx` and/or granular loading states for routes that feel blocked while waiting on server data.

## Not recommended

Avoid these until evidence justifies them:

- Adding Supabase middleware by default (can add overhead; does not inherently remove `getUser` network dependency).
- Introducing React Query/global cache layer.
- Large component architecture rewrites.
- Global caching/Redis-style infrastructure changes.
- Database schema changes for performance before query-level evidence.
- UI redesign work unrelated to measured bottlenecks.

## Recommended next implementation task

Use the new logs to collect one production timing pass, then execute one focused fix:

1. Set `ENABLE_PERF_LOGS=1` on Vercel (Production), redeploy.
2. Log in and navigate: `/` -> `/inventory` -> `/sales/new` -> `/sales` -> `/settings` -> `/login`.
3. Copy `[perf][...]` log lines and identify the single slowest step.
4. If `[perf][layout] getUser` dominates, implement a small follow-up task:
   - switch layout auth gate from `getUser()` to `getSession()`,
   - keep DB/RLS security unchanged,
   - re-measure the same route sequence.

## Manual checks

- Open `https://stock.gorriti.eu`.
- Login.
- Navigate between all target routes.
- Compare with local production (`npm run build && npm run start`) using same env flag.
- Check Vercel function logs for `[perf][...]` lines.
- Note which route/step is slowest and why.
