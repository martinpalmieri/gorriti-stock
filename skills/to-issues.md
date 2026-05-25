# To issues — split a PRD into Cursor-sized tasks

## Purpose

Break a PRD into small, independently implementable vertical slices. Stage database, stock, sales, and UI work safely.

## Use when

- A PRD is too large for one Cursor task.
- Implementation should be staged with validation between steps.
- Database, stock, sales, and UI work should be separated but still shippable.

## Do not use when

- The PRD describes a single obvious change (one route, one action).
- Open product decisions remain — use `grill-me` first.

## Rules

- **Prefer vertical increments** — each issue delivers a usable improvement, not a layer-only stub (e.g. “UI only” with no backend when the feature needs data).
- **Acceptance criteria required** — every issue must be verifiable.
- **Likely files** — name routes, actions, `lib/*`, migrations, tests.
- **Validation commands** — each issue ends with:

  ```bash
  npm run typecheck
  npm run lint
  npm run build
  ```

  Add `npm run e2e` only when the issue changes covered flows.

- **Dependencies** — use `Depends on` for ordering; avoid circular blocks.
- **One session** — keep tasks small enough for one focused Cursor session.
- **Ship small** — validate after each issue before starting the next.

## Gorriti Stock preference

Ship small, validate, then continue.

Examples of good staging:

| Avoid in one issue | Prefer first |
| --- | --- |
| Full offline mode | Offline warning / status only |
| Full import system | Products CSV export |
| Full POS | Manual sale confirmation, then history |

## Issue template

```markdown
# Implementation issues — [Feature name]

## Issue 001 — [Title]

### Goal
One sentence outcome.

### Scope
What is in and out for this issue.

### Files likely touched
- path/to/file.ts
- ...

### Acceptance criteria
- [ ] ...
- [ ] ...

### Validation
```bash
npm run typecheck
npm run lint
npm run build
```

### Depends on
None | Issue 00N

## Issue 002 — [Title]
...
```

## Slicing heuristics

1. **Schema/migration first** only when later issues truly depend on it; otherwise pair migration with the feature that uses it.
2. **Server behavior before polish** — confirm stock movements and sale atomicity before UI flourishes.
3. **Risky logic** — note “apply `tdd`” in the issue when touching stock correction, sale confirmation, CSV escaping, or auth.
4. **Spanish copy** — include UI strings in acceptance criteria when user-visible.
5. **No scope bleed** — if the PRD non-goals mention SumUp, roles, or offline sync, do not sneak them into issues.

## Stock/sales issues

When an issue touches stock or sales, acceptance criteria should mention:

- Movement row created with correct `type`, `quantity_change`, `stock_before`, `stock_after`
- Product edit does not change stock (if applicable)
- Sale confirm creates `sales`, `sale_items`, movements, and updated stock — or fails with no partial data
- Archived/inactive products rejected at confirm
- Server-side total matches line items

## References

- Output PRD from `skills/to-prd.md`
- `AGENTS.md` — required checks and stock rules
