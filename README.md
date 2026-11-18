# My Ride Nepal: admin

Staff-only application for moderators and administrators: overview, verification decisions, contribution moderation, destinations, routes and segments, events oversight, guides, people (roles and suspension) and the audit log. Vue 3 + TypeScript + Vite + Tailwind CSS. It talks only to the Laravel API that lives in the Road-trip-web repository (`../web`).

## Quick start
```sh
pnpm install
# the API must run: in ../web, `pnpm db:start` and `php artisan serve --port=8010`
pnpm dev            # http://127.0.0.1:5181 (proxies /api and /sanctum to :8010)
```
Accounts without a staff role see "No staff access", and every admin endpoint refuses them on the server. There is no sign-up here; the first administrator is created with `php artisan mrn:grant-admin <email>` in ../web.

## Scripts
`pnpm dev`, `pnpm build`, `pnpm preview` (:4181), `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e`.
