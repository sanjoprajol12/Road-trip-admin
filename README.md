# My Ride Nepal: admin

Staff application (moderators and administrators). Vue 3, TypeScript, Vite, Tailwind CSS 4, Supabase. Independent of the public site in `Road-trip-web`, which also holds the database migrations and all documentation (`Road-trip-web/docs/`).

## Setup
```sh
pnpm install
cp .env.example .env.local     # same Supabase project as web, public anon key only
pnpm dev                       # http://localhost:5181
```

## Access model
Anyone can load this app; only accounts with a row in `user_roles` get past "No staff access", and the database (RLS) refuses staff data to everyone else regardless of what the app shows. There is no sign-up here. The first administrator is created with SQL (see `Road-trip-web/docs/USER_ROLES_AND_PERMISSIONS.md`).

## Scripts
`pnpm dev`, `pnpm build`, `pnpm preview` (:4181), `pnpm type-check`, `pnpm lint`, `pnpm test:unit`.
