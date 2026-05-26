# Project Rules

This project is a fan prediction pool for an office foosball tournament.

- This is a game for fun only. Do not add payments, deposits, withdrawals, prizes with cash value, odds, real-money betting, or gambling integrations.
- All predictions are for points only.
- Keep the stack to Next.js App Router, TypeScript, Tailwind, and Supabase unless there is a clear project decision to change it.
- Admin access is intentionally simple for the MVP: one password from `.env`.
- Keep the code straightforward, readable, and maintainable. Prefer small server actions and plain Supabase queries over unnecessary abstractions.
- Preserve the core rules: unique participant names, one prediction per participant per match, no predictions after the deadline, and automatic score recalculation after winners are set.
