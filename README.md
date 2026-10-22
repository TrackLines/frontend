# Tracklines frontend

The Tracklines web app: boards, backlog, tickets, sprints, roadmaps, org and personal settings,
billing, and the public (login-free) roadmap and request pages.

Next.js App Router with TypeScript, built and tested with [Bun](https://bun.sh). Clerk for auth,
shadcn/Tailwind for UI, Flags.gg for feature flags, recharts for reports, Bugfixes for error
reporting.

## Run it

```sh
bun install
bun run dev          # http://localhost:3000
bun test             # unit tests
bunx tsc --noEmit    # type-check
bun run build        # production build (what CI runs)
```

Or bring up the whole stack from the repo root with `docker compose up --build`.

## Layout

- `app/` — App Router pages and layouts (`app/settings/*`, board/ticket/roadmap routes, the public
  roadmap/request pages).
- `components/` — UI built from shadcn primitives; don't hand-roll widgets shadcn already provides.
  Settings features follow the `SettingsCard` → own-page pattern.
- `lib/api.ts` — the typed API client. `base()` resolves `NEXT_PUBLIC_API_URL ?? '/api'` in the
  browser; `useToken()` and `useFlags().is('flag-name').enabled()` (kebab-case) gate calls and UI.
- `public/` — static assets, including `embed.js` (the embeddable roadmap/request widget).

## Config

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_URL` | API base (defaults to `/api` via the proxy) |
| `NEXT_PUBLIC_FLAGS_PROJECT_ID` / `_AGENT_ID` / `_ENV_ID` | Flags.gg |
| Clerk publishable/secret keys | authentication (see `.env.example`) |

## Tests

Tests run under `bun test`. Pure "View" components render with `renderToStaticMarkup` (no DOM lib
needed); the `embed.js` widget exports its render helpers as CommonJS so they can be unit-tested the
same way. Every feature ships with tests, including admin/member gating — run the full suite and
`tsc --noEmit` before finishing.
