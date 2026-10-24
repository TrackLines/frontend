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

## Translations

The app uses [Lingui](https://lingui.dev) (TL-549). English is the source language. The catalogues
are `.po` files in `locales/<lang>/messages.po`, so translators can work in Weblate, Crowdin or Poedit.

Wrap visible strings where they're written; the English text is the key:

```tsx
import { Plural, Trans, useLingui } from '@lingui/react/macro';

const { t } = useLingui();              // for props: placeholder={t`Search tickets`}
<Trans>Assigned to me</Trans>           // for text, links and markup inside it too
<Plural value={n} one="# ticket" other="# tickets" />   // never n === 1 ? … : …
```

Helpers in `lib/` take the `I18n` and use `i18n._(msg\`…\`)` (`msg` from `@lingui/core/macro`).
Run `bun run i18n` to extract new strings and compile the catalogues, then commit `locales/`. CI fails
if the catalogues are out of date. Tests that render Lingui components use `render` from `test/i18n.tsx`.
`bun test` runs the macros through a Babel plugin (`test/lingui-preload.ts`), and the build uses
`@lingui/swc-plugin`.
