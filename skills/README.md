# Gorriti Stock agent skills

Use these skills before or during Cursor tasks. They are process guidance for agents and humans — not runtime code.

Read the relevant skill file when starting work that matches its purpose.

## grill-me

Use before unclear product or workflow decisions.

**File:** `skills/grill-me.md`

## to-prd

Use after an idea is clear but before implementation.

**File:** `skills/to-prd.md`

## to-issues

Use to split a PRD into small vertical Cursor tasks.

**File:** `skills/to-issues.md`

## tdd

Use for risky logic: stock, sales, Supabase actions, auth, CSV export.

**File:** `skills/tdd.md`

## codebase-architecture-audit

Use after feature bursts or before larger refactors.

**File:** `skills/codebase-architecture-audit.md`

## Typical flows

**New feature idea**

```txt
grill-me → to-prd → to-issues → implement (use tdd when logic is risky)
```

**Risky stock/sale logic**

```txt
tdd (behavior-first) → implement → required checks
```

**After several Cursor tasks**

```txt
codebase-architecture-audit → small follow-up issues
```

## Project anchors

When skills reference product rules, also read:

- `AGENTS.md` — agent rules and stock/auth constraints
- `docs/CODEX_INSTRUCTIONS.md` — implementation detail
- `docs/GORRITI_STOCK_PLAN.md` — MVP scope and flows
- `docs/SUPABASE_SETUP.md` — env vars, migrations, RLS
