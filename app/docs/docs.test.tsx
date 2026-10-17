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
