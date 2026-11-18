# My Ride Nepal admin: working instructions

Staff-only SPA (GitHub Road-trip-admin). The API, docs, handoff and project rules live in `../web/`: read `../web/CLAUDE.md` and `../web/docs/handoff.md` first.

- Never import from `../web` or any folder outside this one. Code both apps need is copied (`src/lib/api/client.ts` is a copy of web's; change both together).
- Talks only to the Laravel API (`/api/v1`) through the Vite proxy (dev :5181, preview :4181 → Laravel :8010). Route guards are cosmetic; every admin endpoint checks `can:staff` / `can:admin` on the server.
- Role changes need password confirmation (HTTP 423 → `usePasswordConfirm`).
- Tokens in `src/assets/styles/main.css` are a copy of web's; change both together.
- Checks: `pnpm type-check && pnpm lint && pnpm test:unit && pnpm build`, then `pnpm test:e2e --project=chromium --project=firefox` with Postgres running (`pnpm db:start` in ../web).
