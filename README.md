# My Ride Nepal: staff portal

The staff dashboard and CMS of My Ride Nepal (Vue 3 + TypeScript + Vite + Tailwind CSS): verification, moderation, destinations, routes, events, guides, people and roles, media, settings, audit log.

It talks only to the Laravel API in the Road-trip-web repository (`../web`), through `/api` and `/sanctum`. It does not depend on the public website.

## Run
```sh
pnpm install && cp .env.example .env
# the API must run: in ../web, `pnpm db:start` and `composer dev`
pnpm dev            # http://127.0.0.1:5181 (proxies /api and /sanctum to API_TARGET, default :8010)
```
Every staff endpoint checks permissions on the server; the menu and route guards only hide what the server would refuse.

## Scripts
`pnpm dev`, `pnpm build` (types + build to `dist/`), `pnpm preview` (:4181), `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` (starts its own API from ../web on :8011 with the isolated `myridenepal_e2e` database). Deployment: `vercel.json` (set the API origin first; `scripts/check-deploy-config.mjs` refuses the placeholder).
