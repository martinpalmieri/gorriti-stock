# Codex Instructions

Work incrementally. Do not build the whole app in one task.

After every task, you must:

1. Run `npm run typecheck`
2. Run `npm run lint`
3. Run `npm run build`
4. If UI changed, run the app and provide screenshots or Playwright screenshot artifacts
5. Clearly state what was tested and what was not tested

If a command cannot run, explain exactly why and fix the repo setup if possible.

Do not say "I couldn't run the app" without first checking:

- dependencies installed
- package scripts
- missing environment variables
- whether mocked data can be used
- whether the feature can be tested without Supabase

Prefer mocked data for early UI work.

Use Spanish UI copy.
