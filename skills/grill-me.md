# Grill me — clarify before building

## Purpose

Force clarification before implementation. Reduce wrong assumptions on stock, sales, auth, and shop workflows.

## Use when

- The feature or fix is vague.
- The workflow is unclear.
- Product behavior could branch in multiple ways.
- Stock, sales, or security-sensitive data could be affected.
- Someone says “let’s build X” but details are incomplete.

## Do not use when

- The task is a tiny, obvious bugfix with one correct behavior.
- Requirements are already written in a PRD or issue with acceptance criteria.

## Workflow

1. **Restate the goal** in one or two sentences. Confirm what “done” means for Gorriti Stock (one shop, Spanish UI, internal backoffice).
2. **Identify missing decisions** — list what is unknown or ambiguous.
3. **Explore the repo first** — read relevant routes, server actions, `lib/*` modules, migrations, and docs before asking the user. If the code or `docs/GORRITI_STOCK_PLAN.md` already answers something, treat it as a known fact.
4. **Ask only necessary questions** — prefer concrete multiple-choice or yes/no over open-ended brainstorming.
5. **Walk through dependencies** — show how one decision blocks or enables another (e.g. sale confirmation before sales history CSV).
6. **Stop when ready** — end when there is a shared, implementation-ready understanding. Suggest `to-prd` if the scope is still large.

## Gorriti Stock checks

For every grilled idea, explicitly consider:

| Check | Question |
| --- | --- |
| Stock | Does this affect `products.current_stock`? |
| Movements | Does this create, skip, or bypass `stock_movements`? |
| Product CRUD | Does this affect product creation or metadata editing? |
| Sale confirmation | Does this affect cart → confirm sale flow? |
| Archived / inactive | Does this affect `is_active` or selling discontinued products? |
| Supabase | Does this need migrations, RLS, server actions, or env vars? |
| CSV export | Does this affect export columns or escaping? |
| Spanish UI | Does this need new labels or copy? |
| Scope creep | Does this add SaaS, roles, multi-tenant, SumUp, or offline sync? |

Reminders:

- Every stock change must create a `stock_movements` row.
- Normal product editing must not change stock.
- Do not add roles or multi-tenant logic unless explicitly requested.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-only.

## Output format

Produce this structure:

```markdown
# Grill result

## Goal
...

## Known facts
...

## Open decisions
1. ...

## Repo findings
...

## Recommendation
...
```

In **Recommendation**, say whether to proceed, write a PRD (`to-prd`), or split work (`to-issues`). Name which Gorriti checks passed or need decisions.

## References

- `AGENTS.md` — stock and auth rules
- `docs/CODEX_INSTRUCTIONS.md` — sale confirmation and env rules
- `docs/GORRITI_STOCK_PLAN.md` — MVP vs non-MVP scope
