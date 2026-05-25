# Codebase architecture audit

## Purpose

Keep the codebase easy for agents and humans to work with. Find confusion and duplication before it spreads — without rewriting everything.

## Use when

- After several Cursor tasks or a feature burst.
- Before a large new feature or refactor.
- Files become too large or noisy.
- Logic is duplicated across inventory and sales.
- Server/client boundaries feel unclear.

## Do not use when

- You are mid-implementation on an unrelated task — finish or park work first.
- The user only asked for a one-line fix.

## Important

- **Do not refactor during the audit** unless explicitly asked.
- Prefer concrete follow-up tasks (suitable for `to-issues`).
- Avoid broad rewrites and “clean slate” proposals.

## Workflow

1. Skim hotspots (list below) and recent git changes if helpful.
2. Answer the audit questions honestly.
3. Produce the output format.
4. Suggest **small** follow-ups; mark “do not refactor yet” for risky or low-value areas.

## Audit questions

- Where is one component doing too much?
- Where is domain logic trapped inside JSX?
- Where are server actions mixed too closely with client state?
- Where are Supabase queries duplicated?
- Where are stock/sale rules repeated or unclear?
- Where are types drifting from database constraints in `types/database.types.ts`?
- Where are UI components repeated without reason?
- Where are agents likely to make mistakes (silent stock change, client-side totals, service role in client)?

## Gorriti Stock hotspots

Prioritize review in:

| Area | Path |
| --- | --- |
| Inventory UI | `app/_components/inventory/*` |
| Sales UI | `app/_components/sales/*` |
| Inventory actions | `app/(protected)/inventory/actions.ts` |
| New sale actions | `app/(protected)/sales/new/actions.ts` |
| Settings | `app/(protected)/settings/*` |
| Inventory lib | `lib/inventory/*` |
| Sales lib | `lib/sales/*` |
| Dashboard lib | `lib/dashboard/*` |
| Supabase helpers | `lib/supabase/*` |
| Migrations | `supabase/migrations/*` |
| Generated types | `types/database.types.ts` |

Agent-risk patterns to flag:

- Direct `current_stock` updates without `stock_movements`
- Client-trusted sale totals
- `SUPABASE_SERVICE_ROLE_KEY` imported outside server-only modules
- New roles, tenant IDs, or permission layers without explicit product request

## Output format

```markdown
# Codebase architecture audit

## Summary
2–4 sentences on overall health.

## Confusing areas
- path — what is confusing and why

## High-value refactors
Small, safe improvements with clear payoff.

## Do not refactor yet
Areas that are messy but stable, or risky to touch before MVP milestones.

## Suggested small tasks
Numbered list suitable for `to-issues` or ad-hoc issues (title + one-line goal).
```

## After the audit

- Share with the team or paste into the next planning task.
- Optionally run `to-issues` on “Suggested small tasks” if the list is large.
- Re-run after the next 5–8 substantial Cursor tasks.

## References

- `AGENTS.md` — principles and stock rules
- `skills/to-issues.md` — turning suggestions into staged work
