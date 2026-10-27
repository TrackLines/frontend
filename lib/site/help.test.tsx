import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { render } from '@/test/i18n';
import { HelpAnswers } from '@/components/layout/help-bot';
import { appRoute, hrefFor, search, suggestions, type HelpEntry } from './help';
import seeded from '@/test/help-answers.json';

// the answers the backend seeds (TL-575), as GET /api/help returns them in English and Dutch
const HELP = seeded.en as HelpEntry[];
const NL = seeded.nl as HelpEntry[];
const ids = (list: { slug: string }[]) => list.map((e) => e.slug);

// TL-569: every seeded answer points somewhere real (with [project] / [board] as the route's [id]).
test('every answer links to a page that exists, and slugs are unique', () => {
  expect(HELP.length).toBe(37);
  expect(new Set(ids(HELP)).size).toBe(HELP.length);
  for (const e of HELP) {
    for (const href of [e.href, e.fallback_href].filter(Boolean)) {
      expect(appRoute(href)).toBe(true);
      const dir = href.split('?')[0].replace(/\[(project|board)\]/, '[id]');
      expect(existsSync(new URL(`../../app${dir}/page.tsx`, import.meta.url)), `${e.slug}: ${href}`).toBe(true);
    }
  }
});

test('search ranks by the words you typed, questions first', () => {
  expect(ids(search(HELP, 'add a board'))[0]).toBe('add-board');
  expect(ids(search(HELP, 'GitHub'))[0]).toBe('repos');
  expect(ids(search(HELP, 'holiday'))).toContain('holiday'); // an extra search word
  expect(ids(search(HELP, 'dark mode'))[0]).toBe('theme');
  expect(search(HELP, 'xyzzy')).toEqual([]);
  expect(search(HELP, '  ')).toEqual([]);
  expect(search(HELP, 'board').length).toBeLessThanOrEqual(5);
});

test('Dutch finds answers in Dutch, accents or not', () => {
  expect(ids(search(NL, 'bord toevoegen'))).toContain('add-board');
  expect(ids(search(NL, 'donkere modus'))).toContain('theme');
});

test('before you type: the answers for this page, else the ticket ones', () => {
  expect(ids(suggestions(HELP, '/projects/p1'))[0]).toBe('add-board');
  expect(ids(suggestions(HELP, '/boards/b1'))).toContain('sprint');
  expect(ids(suggestions(HELP, '/settings/organization'))).toContain('invite');
  expect(ids(suggestions(HELP, '/tickets/t1'))).toEqual(ids(HELP.filter((e) => e.pages.length === 0)).slice(0, 5));
  expect(suggestions(HELP, '/projects/p1').length).toBeLessThanOrEqual(5);
});

test('links fill in the project or board you are on', () => {
  const find = (slug: string) => HELP.find((e) => e.slug === slug)!;
  expect(hrefFor(find('add-board'), '/projects/p1')).toBe('/projects/p1/edit');
  expect(hrefFor(find('add-board'), '/my-work')).toBe('/dashboard');
  expect(hrefFor(find('repos'), '/settings')).toBe('/settings/integrations');
  expect(hrefFor(find('sprint'), '/boards/b1')).toBe('/boards/b1');
});

test('a link must be an app route, never another site', () => {
  for (const ok of ['', '/dashboard', '/projects/[project]/edit', '/boards/[board]?view=next']) expect(appRoute(ok)).toBe(true);
  for (const bad of ['https://evil.example', '//evil.example', 'dashboard', '/\\evil.example', 'javascript:alert(1)']) expect(appRoute(bad)).toBe(false);
});

test('the panel: API answers with links, and the docs and contact when nothing matches', () => {
  const html = render(<HelpAnswers entries={HELP} query="add a board" pathname="/projects/p1" />);
  expect(html).toContain('How do I add another board?');
  expect(html).toContain('href="/projects/p1/edit"');
  expect(html).toContain('Take me there');
  expect(render(<HelpAnswers entries={NL} query="bord toevoegen" pathname="/projects/p1" />)).toContain('Hoe voeg ik nog een bord toe?');
  expect(render(<HelpAnswers entries={HELP} query="dark mode" pathname="/" />)).not.toContain('Take me there'); // nowhere to go
  const none = render(<HelpAnswers entries={HELP} query="xyzzy" pathname="/" />);
  expect(none).toContain('href="/docs"');
  expect(none).toContain('href="/contact"');
});

test('the panel asks the API in your language (TL-579)', async () => {
  const { help } = await import('../api');
  const real = globalThis.fetch;
  let asked = '';
  globalThis.fetch = (async (url: string) => { asked = String(url); return Response.json([]); }) as unknown as typeof fetch;
  try {
    await help.list('nl', 't');
  } finally {
    globalThis.fetch = real;
  }
  expect(asked).toEndWith('/help?locale=nl');
});
