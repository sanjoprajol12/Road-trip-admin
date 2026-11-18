# My Ride Nepal admin: working instructions

This is the staff app ("/admin"). Project rules, docs, handoff and the database live in `../Road-trip-web/` — read `../Road-trip-web/CLAUDE.md` and `../Road-trip-web/docs/handoff.md` first.

- Never import from `../Road-trip-web`; the apps install and build independently.
- Route guards are cosmetic. Every staff permission must be enforced by RLS in `../Road-trip-web/supabase/migrations` with a test in `supabase/tests/rls.test.sql`.
- Tokens in `src/assets/styles/main.css` are a copy of web's; change both together.
- Checks: `pnpm type-check && pnpm lint && pnpm test:unit && pnpm build`.
