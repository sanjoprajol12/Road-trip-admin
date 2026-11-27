# My Ride Nepal: staff portal

React 19 + Vite 8 + TypeScript (5.9) + React Router + TanStack Query + Tailwind CSS 4. Independent app: its own dependencies, config, tests and build. It has **no secrets**; every staff action is authorized again by the backend.

## Setup

This is a separate project. It talks to the backend only over HTTP (`/api`), never through its files.

```bash
npm ci
cp .env.example .env   # API_TARGET for the dev/preview proxy (never bundled)
```

## Commands

| Command                                                             | What it does                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                                       | http://localhost:5274, proxies `/api` to the API                                                                                                                                                                                                      |
| `npm run check`                                                     | everything CI runs: lint, typecheck, format, tests, build, production audit                                                                                                                                                                           |
| `npm test`                                                          | component tests                                                                                                                                                                                                                                       |
| `npm run test:e2e`                                                  | Playwright against this app's production build (preview on :4274). Needs a running API on the isolated E2E database, reached over HTTP at `E2E_API_URL` (default http://localhost:4001); in the backend project: `npm run build && npm run start:e2e` |
| `npm run lint` / `typecheck` / `format:check` / `build` / `preview` | as in the public website                                                                                                                                                                                                                              |

## Notes

- Barlow only, dark sidebar, content on the neutral subtle surface ([design system](https://github.com/sanjoprajol12/Road-trip-web/tree/develop/docs/design/DESIGN_SYSTEM.md) in the backend repository §11).
- `noindex, nofollow` in `index.html`; the host should also send `X-Robots-Tag: noindex`.
- Staff sign-in, permission-filtered navigation and route guards arrive in stage S1.
