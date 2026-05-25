# To PRD — requirements before code

## Purpose

Turn a clarified idea into a short product requirements document. Make stock, sales, and Supabase behavior explicit before implementation.

## Use when

- The feature is bigger than a small bugfix.
- The feature touches several routes, components, or server actions.
- Stock or sales logic needs explicit rules.
- UX behavior needs clarity (shop-counter speed, Spanish copy).
- Database or Supabase behavior may be involved.

## Do not use when

- A single-file fix with obvious acceptance criteria.
- `grill-me` still has open decisions — finish clarifying first.

## Workflow

1. Confirm the grilled goal (or run `grill-me` first).
2. Scan the repo for existing patterns (inventory, sales, settings, migrations).
3. Draft the PRD using the template below.
4. Call out MVP vs later explicitly.
5. Hand off to `to-issues` if more than one Cursor session is likely.

## PRD template

```markdown
# PRD — [Feature name]

## Problem
What pain exists today? Why now?

## User
Who uses this in the shop? (MVP: any authenticated user, one shop.)

## Goal
What outcome does this deliver?

## Non-goals
What is explicitly out of scope for this PRD?

## User stories
- As a … I want … so that …

## Functional requirements
Numbered, testable behaviors.

## UX requirements
Spanish copy notes, layout, keyboard/search expectations, error messages.

## Data requirements
Tables, columns, movement types, migrations, types in `types/database.types.ts`.

## Security/privacy impact
Auth, RLS, env vars, service role usage, client vs server boundaries.

## Stock/sales impact
How stock and movements change; sale confirmation rules; archived products.

## Acceptance criteria
Checklist for “done”.

## Risks
What could go wrong; partial writes; non-atomic flows; scope creep.
```

## Gorriti Stock reminders

Embed these in the PRD where relevant:

- **Spanish UI** — all user-facing text in clear neutral Spanish.
- **Internal & simple** — one shop backoffice, not a SaaS product.
- **No roles / multi-tenant** — unless explicitly requested.
- **Secrets** — never expose `SUPABASE_SERVICE_ROLE_KEY` in client/browser code; document server-only use.
- **Stock integrity** — every stock change creates a `stock_movements` row; product edit forms do not mutate stock directly.
- **Sale totals** — recalculate server-side from current prices; do not trust client totals.
- **Sale failure** — no partial sale + movement + stock update on error.
- **Stock floor** — stock must not go below zero.
- **Archived products** — inactive/archived products must not be sold.
- **Payments** — do not implement SumUp/payment integration unless explicitly requested.
- **Offline** — do not implement offline sync unless explicitly requested; online-first with honest status indicator is OK.

## Stock/sales section guidance

When the feature touches inventory or sales, the PRD must state:

| Topic | Required detail |
| --- | --- |
| Movement type | `initial`, `sale`, `manual_correction`, etc. |
| When stock changes | Only on create, correction, or confirmed sale — not on metadata edit |
| Atomicity | RPC/transaction vs sequential Supabase writes |
| Error copy | Spanish messages (e.g. insufficient stock) |

## After the PRD

- Small fix → implement directly, optionally with `tdd`.
- Multi-step feature → `to-issues`.
- Schema change → migration file in `supabase/migrations/` plus doc note in PRD.

## References

- `docs/GORRITI_STOCK_PLAN.md` — flows and MVP acceptance criteria
- `docs/CODEX_INSTRUCTIONS.md` — stock and sale confirmation rules
- `docs/SUPABASE_SETUP.md` — env and migration process
