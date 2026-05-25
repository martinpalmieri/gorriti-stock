# TDD — behavior-first for risky logic

## Purpose

Use behavior-first / test-first implementation for logic that can break stock, sales, auth, or data integrity.

## Use when code touches

- Stock correction
- Product creation (including initial movement)
- Duplicate product detection
- Sale confirmation
- Sale totals (server-side recalculation)
- `stock_movements` creation or constraints
- Archived / inactive products in sales
- CSV escaping or export logic
- Supabase server actions
- Auth or protected routes
- RLS, security, or env-dependent behavior

## Do not use when

- Pure copy or styling with no logic change.
- Documentation-only changes.

## Workflow

1. **Identify behaviors to protect** — list invariants (see checklist below).
2. **Check existing test setup** — unit tests, Playwright e2e, patterns under `tests/` or `e2e/`.
3. **Write failing tests first** when tests exist and the behavior is risky.
4. **Manual fallback** — if automated tests are too heavy for this slice, document explicit manual steps in the task output (do not skip verification).
5. **Implement minimal code** to pass tests or manual checks.
6. **Refactor only after** behavior passes.
7. **Run required commands** before finishing:

   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

   Run `npm run e2e` when flows under test changed.

## Required output

Include in the task summary:

```markdown
## Behaviors protected
- ...

## Tests added/updated
- path/to/test — what it covers
(or “none — manual fallback below”)

## Manual fallback if no test setup
1. ...

## Commands run
- npm run typecheck — pass/fail
- npm run lint — pass/fail
- npm run build — pass/fail
```

## Gorriti Stock behaviors to protect

| Area | Invariant |
| --- | --- |
| Product creation | Exactly one initial `stock_movements` row; stock matches initial quantity |
| Product edit | Metadata changes never change `current_stock` |
| Manual correction | Creates `manual_correction` movement; stock never below zero |
| Sale confirmation | Creates `sales`, `sale_items`, sale movements, updates stock |
| Sale failure | No partial sale/items/movements/stock updates |
| Archived products | Cannot be sold or added to confirmed sale |
| Sale totals | Server recalculates from DB prices; client totals not trusted |
| CSV export | Commas, quotes, and line breaks escaped correctly |
| Service role | `SUPABASE_SERVICE_ROLE_KEY` never in client/browser bundles |

## E2E notes

- Playwright may use `PLAYWRIGHT_BYPASS_AUTH=1` in dev only (`lib/playwright-auth-bypass.ts`).
- Supabase `signUp` in e2e requires `E2E_ALLOW_SUPABASE_SIGNUP=1`, `E2E_EMAIL`, `E2E_PASSWORD` — use disposable projects only.

## When tests are impractical

Prefer a thin test over no test. If only manual checks are feasible:

- List steps in Spanish UI terms where helpful.
- Include edge cases (zero stock, inactive product, over-quantity).
- Note which migration or RPC must exist first.

## References

- `AGENTS.md` — stock rules and required checks
- `docs/CODEX_INSTRUCTIONS.md` — sale confirmation and movement rules
- `docs/GORRITI_STOCK_PLAN.md` — testing checklist section
