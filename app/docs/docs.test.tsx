import { expect, mock, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import DocsPage, { guides } from './page';
import EpicsDocs, { differences } from './epics/page';
import { SiteFooter } from '@/components/layout/site-footer';

test('the docs list each guide, linked', () => {
  const html = renderToStaticMarkup(<DocsPage />);
  for (const g of guides) {
    expect(html).toContain(`href="/docs/${g.slug}"`);
    expect(html).toContain(g.name);
  }
  expect(guides.map((g) => g.slug)).toContain('epics');
});

test('the epics guide has the table of differences, and how to use them on roadmaps', () => {
  const html = renderToStaticMarkup(<EpicsDocs />);
  for (const d of differences) {
    expect(html).toContain(d.what);
    expect(html).toContain(d.epic);
  }
  expect(differences.map((d) => d.what)).toEqual(['Where it lives', 'Estimate', 'Progress', 'Sub-tickets', 'Nesting', 'Finishing', 'Leaving a board']);
  expect(html).toContain('Epics on roadmaps');
  expect(html).toContain('Link an epic…');
  expect(html).toContain('href="/docs"');
});

test('the docs are public and linked from every page’s footer', async () => {
  expect(renderToStaticMarkup(<SiteFooter />)).toContain('href="/docs"');
  // two columns from sm up: the company line, and the links pinned right
  const footer = renderToStaticMarkup(<SiteFooter />);
  expect(footer).toContain('sm:grid-cols-[1fr_auto]');
  expect(footer).toContain('sm:justify-end');
  const proxy = await Bun.file(new URL('../../proxy.ts', import.meta.url)).text();
  expect(proxy).not.toContain("'/docs'"); // no sign-in needed
});

test('the MCP guide: keys, every client’s setup (the same steps as Connect AI), the tools and how agents work', async () => {
  const { default: McpDocs, keys, tools, chain } = await import('./mcp/page');
  const { AGENTS, MCP_URL } = await import('@/components/settings/mcp-connect');
  const { render } = await import('@/test/i18n');
  const prompts = { instructions: 'Work like a member of the team.', tools: [{ name: 'claim_ticket', title: 'Claim ticket', description: 'Assign it to the caller, atomically.' }] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(prompts)) as unknown as typeof fetch;
  const html = render(await McpDocs()); // the Connect AI steps are <Trans>
  // what agents are told, from the API (TL-566); a message when it can't be reached
  expect(html).toContain('Work like a member of the team.');
  expect(html).toContain('Assign it to the caller, atomically.');
  expect(html).toContain('(1 tools)');
  globalThis.fetch = (async () => { throw new Error('down'); }) as unknown as typeof fetch;
  expect(render(await McpDocs())).toContain('They couldn’t be loaded just now.');
  globalThis.fetch = realFetch;
  expect(html).toContain(MCP_URL);
  for (const k of keys) expect(html).toContain(k.kind);
  for (const a of AGENTS) expect(html).toContain(`>${a.name}<`); // one tab per client, from the dialog's own list
  expect(html).toContain('claude mcp add'); // the first client's steps are open
  for (const t of tools) expect(html).toContain(t.name);
  expect(chain).toHaveLength(7);
  expect(chain[2]).toContain('only To do and Done'); // never Done to start it (TL-591)
  expect(html).toContain('href="/docs"');
  expect(renderToStaticMarkup(<DocsPage />)).toContain('href="/docs/mcp"');
});

test('the standup and refinement guides explain them from a user’s side, with the real timings and limits', async () => {
  const { default: StandupDocs } = await import('./standup/page');
  const { default: RefinementDocs } = await import('./refinement/page');
  const standup = renderToStaticMarkup(<StandupDocs />);
  for (const s of ['Join standup', '2 minutes', '5 minutes', 'board review', 'over by 0:30', 'Hand over', 'drag someone’s face', 'Live updates']) expect(standup).toContain(s);
  const refinement = renderToStaticMarkup(<RefinementDocs />);
  for (const s of ['Refine', 'Join refinement', 'To plan', 'up to 2 sprints ahead', 'plus 10%', 'Needs approval', 'Done refining', 'Move out']) expect(refinement).toContain(s);
  const index = renderToStaticMarkup(<DocsPage />);
  expect(index).toContain('href="/docs/standup"');
  expect(index).toContain('href="/docs/refinement"');
});

test('the Google Chat guides: linking your own account, and setting up spaces as an organization', async () => {
  const { default: You } = await import('./google-chat/page');
  const { default: Org } = await import('./google-chat-org/page');
  mock.module('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) })); // serverI18n outside a request: English
  const { CHAT_KINDS } = await import('@/lib/org/google-chat');
  const { i18nFor } = await import('@/lib/i18n');
  const you = renderToStaticMarkup(<You />);
  for (const s of ['Link your TrackLin.es account', 'You’re linked', '30 minutes', 'Your settings', 'Unlink', 'href="/docs/google-chat-org"']) expect(you).toContain(s);
  for (const s of ['Start', 'Add comment', 'Make urgent', 'Reply', 'Approve', 'Send back', 'with your permissions']) expect(you).toContain(s); // the message buttons (TL-455)
  const org = renderToStaticMarkup(await Org());
  for (const s of ['Allow users to add and use incoming webhooks', 'Add webhook', 'Avatar URL', 'Send test message', 'Edit project', 'https://chat.googleapis.com/', 'href="/docs/google-chat"']) expect(org).toContain(s);
  for (const k of CHAT_KINDS) expect(org).toContain(i18nFor('en')._(k.label)); // every event the settings form offers
  const index = renderToStaticMarkup(<DocsPage />);
  expect(index).toContain('href="/docs/google-chat"');
  expect(index).toContain('href="/docs/google-chat-org"');
});

test('the Google Calendar guide: delegation with the scope, connecting, what changes, and what’s kept (TL-411)', async () => {
  const { default: Calendar, CALENDAR_SCOPE } = await import('./google-calendar/page');
  const html = renderToStaticMarkup(<Calendar />);
  for (const s of ['Manage Domain Wide Delegation', 'super admin', CALENDAR_SCOPE, 'Workspace domain', 'Admin email', 'Company days off', 'Sync now', 'Next</strong> skips them', 'Out of office', 'Never the event’s title', 'Disconnect']) expect(html).toContain(s);
  expect(CALENDAR_SCOPE).toBe('https://www.googleapis.com/auth/calendar.readonly'); // backend integrations.calendarScope
  expect(renderToStaticMarkup(<DocsPage />)).toContain('href="/docs/google-calendar"');
});

test('the sprint reports guide: where to open each, what every number means, units, no per-person figures, exporting (TL-402)', async () => {
  const { default: Reports, MEASURES } = await import('./sprint-reports/page');
  const html = renderToStaticMarkup(<Reports />);
  for (const m of MEASURES) expect(html).toContain(m.name);
  expect(MEASURES.map((m) => m.name)).toContain('Predictability');
  for (const s of ['Past sprints', 'Organization admins only', 'by calendar month', 'never add points and tickets together', 'no per-person figures', 'Save as PDF (presentation)', 'Mermaid', 'get_board_sprint_report', 'get_project_sprint_report']) {
    expect(html).toContain(s);
  }
  expect(renderToStaticMarkup(<DocsPage />)).toContain('href="/docs/sprint-reports"');
});

test('the TRMNL guide: a read-only personal key and the plugin on TRMNL (TL-450)', async () => {
  const { default: Trmnl, TRMNL_RECIPE } = await import('./trmnl/page');
  expect(TRMNL_RECIPE).toBe('https://trmnl.com/recipes/tracklin-es-511430');
  const html = renderToStaticMarkup(<Trmnl />);
  for (const s of [`href="${TRMNL_RECIPE}"`, 'href="/account/api-keys"', 'Personal', 'Read only', 'My work']) expect(html).toContain(s);
  expect(renderToStaticMarkup(<DocsPage />)).toContain('href="/docs/trmnl"');
});

// TL-674: the pre-prompt is versioned like the terms: the docs show the latest with its version, list the
// earlier ones, and each earlier one has its own page as it was published
test('the MCP guide: the pre-prompt’s version, earlier versions, and each version’s page', async () => {
  const { default: McpDocs } = await import('./mcp/page');
  const { default: VersionPage } = await import('./mcp/versions/[version]/page');
  const { render } = await import('@/test/i18n');
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.endsWith('/api/mcp/prompts')) return Response.json({ instructions: 'Version three text.', version: 3, published_at: '2026-10-27T20:00:00Z', tools: [] });
    if (u.endsWith('/api/mcp/prompts/versions')) return Response.json([
      { version: 3, note: 'clearer', published_at: '2026-10-27T20:00:00Z' },
      { version: 2, note: 'run the whole suite', published_at: '2026-10-20T09:00:00Z' },
      { version: 1, note: '', published_at: '2026-10-01T09:00:00Z' },
    ]);
    if (u.endsWith('/api/mcp/prompts/versions/2')) return Response.json({ version: 2, body: 'Version two text.', note: 'run the whole suite', published_at: '2026-10-20T09:00:00Z' });
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
  try {
    const html = render(await McpDocs());
    expect(html).toContain('Version 3 · published 27 October 2026');
    expect(html).toContain('Version three text.');
    expect(html).toContain('Earlier versions');
    expect(html).toContain('href="/docs/mcp/versions/2"');
    expect(html).toContain('href="/docs/mcp/versions/1"');
    expect(html).not.toContain('href="/docs/mcp/versions/3"'); // the current one is the page itself
    expect(html).toContain('run the whole suite');
    const v2 = render(await VersionPage({ params: Promise.resolve({ version: '2' }) }));
    expect(v2).toContain('MCP pre-prompt, version 2');
    expect(v2).toContain('Version two text.');
    expect(v2).toContain('Published 20 October 2026: run the whole suite');
    for (const bad of ['99', '0', 'abc']) {
      await expect(VersionPage({ params: Promise.resolve({ version: bad }) })).rejects.toThrow(); // notFound()
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});
