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
