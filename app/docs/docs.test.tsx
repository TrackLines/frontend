import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import DocsPage, { guides } from './page';
import EpicsDocs, { differences } from './epics/page';
import { SiteFooter } from '@/components/site-footer';

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
  const proxy = await Bun.file(new URL('../../proxy.ts', import.meta.url)).text();
  expect(proxy).not.toContain("'/docs'"); // no sign-in needed
});

test('the MCP guide: keys, every client’s setup (the same steps as Connect AI), the tools and how agents work', async () => {
  const { default: McpDocs, keys, tools, chain } = await import('./mcp/page');
  const { AGENTS, MCP_URL } = await import('@/components/mcp-connect');
  const html = renderToStaticMarkup(<McpDocs />);
  expect(html).toContain(MCP_URL);
  for (const k of keys) expect(html).toContain(k.kind);
  for (const a of AGENTS) expect(html).toContain(`>${a.name}<`); // one tab per client, from the dialog's own list
  expect(html).toContain('claude mcp add'); // the first client's steps are open
  for (const t of tools) expect(html).toContain(t.name);
  expect(chain).toHaveLength(7);
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
  const { CHAT_KINDS } = await import('@/lib/google-chat');
  const you = renderToStaticMarkup(<You />);
  for (const s of ['Link your TrackLin.es account', 'You’re linked', '30 minutes', 'Your settings', 'Unlink', 'href="/docs/google-chat-org"']) expect(you).toContain(s);
  const org = renderToStaticMarkup(<Org />);
  for (const s of ['Allow users to add and use incoming webhooks', 'Add webhook', 'Avatar URL', 'Send test message', 'Edit project', 'https://chat.googleapis.com/', 'href="/docs/google-chat"']) expect(org).toContain(s);
  for (const k of CHAT_KINDS) expect(org).toContain(k.label); // every event the settings form offers
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
