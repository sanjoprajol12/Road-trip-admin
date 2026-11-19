# My Ride Nepal staff portal: working instructions

This repo (GitHub Road-trip-admin) holds **only the staff portal** (Vue 3 + TypeScript + Vite + Tailwind; architecture Option A). The Laravel API, the public website (`../web/frontend`), the docs, handoff and project rules live in `../web/`: read `../web/CLAUDE.md` and `../web/docs/handoff.md` first.

- `src/`: `app/` (router, layouts, navigation), `components/ui`, `features/<module>/` (pages, components, services, types), `lib/` (API client, formatting). Alias `@/*` = `src/*`.
- Never import from `../web` or any folder outside this repo. No shared package or third repo.
- Talks only to the Laravel API (`/api/v1`) through the Vite proxy (`API_TARGET`, default :8010) in development and `vercel.json` rewrites in production. Route guards are cosmetic; every endpoint checks permissions on the server.
- Sensitive staff actions need password confirmation (HTTP 423 → `src/lib/usePasswordConfirm.ts`).
- Tokens in `src/assets/styles/main.css`; follow `../web/docs/design/DESIGN_SYSTEM.md`.
- Checks: `pnpm type-check && pnpm lint && pnpm test:unit && pnpm build && pnpm audit --prod`, then `pnpm test:e2e --project=chromium --project=firefox` (starts its own API from ../web on :8011 with the isolated `myridenepal_e2e` database).
