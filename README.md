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
- `components/` — UI built from shadcn primitives (`components/ui/`); don't hand-roll widgets shadcn
  already provides. Everything else is in a domain folder, never loose at the top: `layout` (header,
  footer, menus, providers, skeletons), `common` (markdown, mention box, copy link, pager…), `ticket`,
  `board`, `sprint`, `live` (standups, refinement), `work` (my work, mentions, notifications),
  `project`, `roadmap`, `reports`, `settings`, `intake`, `billing`, `staff`, `landing`, `legal`, `docs`.
  Related project settings share one panel with tabs (Edit project: External, Integrations).
- `lib/` — logic, kept pure for tests, in the same domain folders: `api` (the typed client in
  `lib/api/index.ts`, error codes, the proxy rules, the page cache), `hooks` (`useToken`, `usePeople`…),
  `i18n`, `server` (1Password, security headers, redirects, error reports), `legal` (and its published
  `versions/`), `ticket`, `board`, `sprint`, `live`, `work`, `org`, `site`. `lib/utils.ts` stays where
  shadcn expects it. The API client's `base()` resolves `NEXT_PUBLIC_API_URL ?? '/api'` in the browser;
  `useToken()` and `useFlags().is('flag-name').enabled()` (kebab-case) gate calls and UI.
- `test/` — test helpers, and the repo-wide rule tests (form labels, one input model, the embed widget).
  Every other test sits next to its code.
- `public/` — static assets, including `embed.js` (the embeddable roadmap/request widget).

## Onboarding and feature guides

New organization admins resume setup at `/onboarding`. React Joyride supplies the tour;
organization setup and each user's guide completion are persisted separately by the backend.
Members skip setup, imports reuse their created boards, and completing the tour hides its button
across sessions and devices. Closing or skipping a tour does not mark it complete.

Each guide chapter navigates to the actual page and spotlights its controls. Create a project
opens Projects and follows the name dialog; Create your first ticket follows a project card,
its Backlog tab, Add to backlog and the ticket form. The layout retains the active tour while
navigating. Visible targets may mount asynchronously, and creation steps wait for successful API
responses. Existing projects can be reused without consuming another plan slot. GitHub, TUI and
MCP chapters open their real settings/documentation. Only covering all chapters completes the guide.
Stable `data-guide` attributes and `lib/org/guide-tour.ts` supply its navigation and action contract.

To publish a guide for newly released features, update its steps in
`components/onboarding/guide.tsx` and deliberately increment `GUIDE.version` in
`lib/org/onboarding.ts` together with `GuideVersion` in the backend. Keep the guide ID stable.
Deploy the backend first; unmatched versions are hidden until the matching frontend is deployed.
Routine releases must not change the guide version. A newer guide never repeats project setup.

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
