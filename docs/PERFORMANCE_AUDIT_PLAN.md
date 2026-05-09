# Performance Audit Plan

## Problem

Navigating through the app feels slow, even with little or no data loaded.
Goal: identify why and propose focused, low-risk improvements before changing anything large.

## Routes to test

- `/` (dashboard)
- `/inventory`
- `/sales/new`
- `/sales`
- `/settings`

## Measurement plan

1. Local dev navigation
   - `npm run dev`
   - Click each route in order, then re-click already-visited routes.
   - Note "first hit" vs "warm hit" timings; dev compiles per route on first visit.
2. Production-local navigation
   - `npm run build && npm run start`
   - Repeat the same click pattern.
   - If prod is fast and dev is slow, dev compile is the dominant cause.
3. Server-side timing logs (temporary, dev-only)
   - In `app/(protected)/layout.tsx`, around `createClient()` and `supabase.auth.getUser()`:
     ```ts
     const t0 = performance.now();
     const supabase = await createClient();
     const t1 = performance.now();
     const {
       data: { user },
     } = await supabase.auth.getUser();
     const t2 = performance.now();
     console.log(
       `[layout] createClient=${(t1 - t0).toFixed(1)}ms getUser=${(t2 - t1).toFixed(1)}ms`,
     );
     ```
   - Same shape around the page-level data loaders:
     - `lib/dashboard/load-dashboard.ts`
     - `lib/inventory/data.ts:getInventoryData`
     - `app/(protected)/sales/page.tsx` queries
     - `app/(protected)/sales/new/actions.ts:listActiveProductsForSale`
     - `app/(protected)/settings/categories-section.tsx`
4. Browser DevTools
   - Network tab: look at the duration of `/auth/v1/user` and PostgREST calls.
   - Performance tab: only if needed after the server timings are clear.
5. Console timing
   - Optional `console.time` around large client useMemo blocks (`product-list.tsx`, `new-sale-layout.tsx`) to confirm filtering is not the bottleneck.

## Suspected bottlenecks

1. `next dev` compile cost
   - Big client components are compiled on first navigation:
     - `app/_components/inventory/product-list.tsx` (1160 lines)
     - `app/_components/sales/new-sale-layout.tsx` (509 lines)
   - In production these are bundled once and serve fast.

2. Auth round-trip on every protected route
   - `app/(protected)/layout.tsx` calls `supabase.auth.getUser()` on every navigation.
   - Supabase SSR `getUser()` is a network call to `/auth/v1/user`. There is no middleware in this project to share or refresh the session, and no caching layer.
   - With normal latency this can dominate small-data pages (~150-300 ms).

3. Sales over-fetch and sequential queries
   - `app/(protected)/sales/page.tsx` runs:
     ```ts
     await supabase
       .from("sales")
       .select(
         "id, created_at, total_amount, payment_method, status, sale_items(quantity)",
       )
       .order("created_at", { ascending: false });
     ```
     with no `.limit(50)`, then `.slice(0, 50)` in JS.
   - Then it awaits `getSaleDetail(sales[0].id)` sequentially before rendering.

4. Redundant client refreshes after server actions
   - Server actions call `revalidatePath` (e.g. `app/(protected)/inventory/actions.ts`), but client components also call `router.refresh()`:
     - `app/_components/inventory/product-list.tsx` (3 places)
     - `app/_components/sales/new-sale-layout.tsx`
     - `app/(protected)/settings/categories-manager.tsx`
   - This effectively requests fresh RSC payloads twice in some flows.

5. Possibly cold dynamic import of `@supabase/ssr`
   - `lib/supabase/server.ts` uses `new Function('specifier', 'return import(specifier)')` to load `@supabase/ssr`. Module cache should make repeat calls cheap, but worth confirming with the timing logs.

6. Large client trees, not yet a bottleneck
   - `product-list.tsx` is huge. It memoizes `clientProducts` and `filteredProducts`. Filtering work is fine for small N. Worth splitting later mainly to reduce dev compile time and improve readability, not because filtering is slow.

## Quick wins, candidates for now

A. Add `.limit(50)` to the sales list query

- File: `app/(protected)/sales/page.tsx`
- Replace `.order('created_at', { ascending: false })` with `.order('created_at', { ascending: false }).limit(50)` and drop the JS `.slice(0, 50)`.
- Risk: none.

B. Parallelize sales list and first-row detail

- File: `app/(protected)/sales/page.tsx`
- Fetch the list and call `getSaleDetail` only after we know the first id, but issue them in parallel where possible. Simplest: do not eagerly fetch the detail server-side; let `SalesList` fetch it on first render or lazy-load on click. Or: keep eager fetch but issue as soon as we have the first id alongside other work.
- Risk: low, behavior preserved.

C. Drop redundant `router.refresh()` after server actions that already `revalidatePath`

- Files:
  - `app/_components/inventory/product-list.tsx` (3 sites)
  - `app/_components/sales/new-sale-layout.tsx`
  - `app/(protected)/settings/categories-manager.tsx`
- Risk: low, but verify each flow still updates after mutation. Some flows rely on `router.refresh()` to re-render the page with fresh server-side props.

D. Optional: collapse `from('products').select('*', { count: 'exact', head: true })` count queries

- File: `lib/dashboard/load-dashboard.ts`
- Two count queries can be replaced by one query that returns minimal columns and counts client-side, OR by a single Postgres function. Skip for now, current approach is correct and small-data.

## Larger refactors, only if Phase 1 measurements justify them

L1. Add Supabase auth middleware

- Add `middleware.ts` per Supabase Next.js SSR docs to keep the session cookie fresh and centralize `getUser()` once per request.
- This does not eliminate the `/auth/v1/user` call, but avoids accidental extra `getUser()` calls in pages and ensures cookies are not stale after long idle.
- Risk: medium, requires careful matcher and cookie handling.

L2. Server-side filter/search for inventory

- Move category, condition, stock, and search filters into URL params and into the Supabase query in `lib/inventory/data.ts`.
- Reduces payload and lets the inventory client component shrink.
- Risk: medium, changes UX state model.

L3. Split `product-list.tsx`

- Extract `ProductForm`, `StockCorrectionModal`, search/filters, list, and detail aside into separate client components.
- Goal: smaller dev compile and clearer re-render scope.
- Risk: medium, mostly mechanical.

L4. Stream the sales detail

- Convert eager `getSaleDetail(sales[0].id)` server fetch into a `<Suspense>` boundary, so the list paints first.
- Risk: low.

L5. Replace `new Function('return import(...)')` with a normal top-level import

- In `lib/supabase/server.ts`, if the dynamic import is not actually needed, switch to `import { createServerClient } from '@supabase/ssr'`. Confirm no SSR/edge constraint relies on the dynamic shape.
- Risk: low.

## Risks

- Removing `router.refresh()` could mask a flow that relied on it for re-render. Verify each affected flow manually.
- Adding middleware can break auth if cookie handling is subtly wrong; copy the official Supabase SSR template carefully.
- Server-side filtering changes the URL and back-button behavior; not for this audit pass.

## Recommended implementation order

Phase 1 - Measure

- Add temporary timing logs in `(protected)/layout.tsx` and each route's data loader.
- Run `npm run dev` and `npm run build && npm run start`, click each route twice, capture numbers.
- Identify the slowest route and the slowest sub-step.

Phase 2 - Quick wins, low risk

- Apply A and B in `app/(protected)/sales/page.tsx`.
- Apply C: remove redundant `router.refresh()` calls where `revalidatePath` already covers the case.
- Re-measure.

Phase 3 - Re-render and refresh hygiene

- Audit each `revalidatePath` and confirm minimal scope.
- Consider replacing some `router.refresh()` patterns with optimistic local state updates already used for stock overrides.

Phase 4 - Larger refactors, only if needed

- Add Supabase middleware (L1).
- Move inventory filters server-side (L2).
- Split `product-list.tsx` (L3).
- Stream sales detail (L4).
- Replace dynamic `@supabase/ssr` import (L5).

## What not to do

- Do not add caching blindly (no global `unstable_cache`, no Redis, no React Query yet).
- Do not add complex state management, the current `useState`/`useMemo` model is fine.
- Do not change the schema unless a measurement clearly demands it.
- Do not rewrite the whole app or the inventory list in one pass.
- Do not sacrifice correctness of stock and sales logic for speed; every stock change must still create a `stock_movements` row.
- Do not over-focus on CSS, no clear issue was observed.
