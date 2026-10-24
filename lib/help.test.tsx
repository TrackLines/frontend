import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { render } from '@/test/i18n';
import { HelpAnswers } from '@/components/help-bot';
import { HELP, hrefFor, search, suggestions } from './help';
import { i18nFor } from './i18n';

const en = i18nFor('en');
const ids = (list: { id: string }[]) => list.map((e) => e.id);

// TL-569: every answer points somewhere real (with [project] / [board] as the route's [id]).
test('every answer links to a page that exists, and ids are unique', () => {
  expect(new Set(ids(HELP)).size).toBe(HELP.length);
  for (const e of HELP) {
    for (const href of [e.href, e.fallback].filter(Boolean) as string[]) {
      const dir = href.split('?')[0].replace(/\[(project|board)\]/, '[id]');
      expect(existsSync(new URL(`../app${dir}/page.tsx`, import.meta.url)), `${e.id}: ${href}`).toBe(true);
    }
  }
});

test('search ranks by the words you typed, questions first', () => {
  expect(ids(search(en, HELP, 'add a board'))[0]).toBe('add-board');
  expect(ids(search(en, HELP, 'GitHub'))[0]).toBe('repos');
  expect(ids(search(en, HELP, 'holiday'))).toContain('holiday'); // an extra search word
  expect(ids(search(en, HELP, 'dark mode'))[0]).toBe('theme');
  expect(search(en, HELP, 'xyzzy')).toEqual([]);
  expect(search(en, HELP, '  ')).toEqual([]);
  expect(search(en, HELP, 'board').length).toBeLessThanOrEqual(5);
});

test('Dutch finds answers in Dutch, accents or not', () => {
  const nl = i18nFor('nl');
  expect(ids(search(nl, HELP, 'bord toevoegen'))).toContain('add-board');
  expect(ids(search(nl, HELP, 'donkere modus'))).toContain('theme');
});

test('before you type: the answers for this page, else the ticket ones', () => {
  expect(ids(suggestions(HELP, '/projects/p1'))[0]).toBe('add-board'); // the ticket's example
  expect(ids(suggestions(HELP, '/boards/b1'))).toContain('sprint');
  expect(ids(suggestions(HELP, '/settings/organization'))).toContain('invite');
  expect(ids(suggestions(HELP, '/tickets/t1'))).toEqual(ids(HELP.filter((e) => e.pages.length === 0)).slice(0, 5));
  expect(suggestions(HELP, '/projects/p1').length).toBeLessThanOrEqual(5);
});

test('links fill in the project or board you are on', () => {
  const addBoard = HELP.find((e) => e.id === 'add-board')!;
  expect(hrefFor(addBoard, '/projects/p1')).toBe('/projects/p1/edit');
  expect(hrefFor(addBoard, '/my-work')).toBe('/dashboard');
  const repos = HELP.find((e) => e.id === 'repos')!;
  expect(hrefFor(repos, '/settings')).toBe('/settings/integrations');
  expect(hrefFor(HELP.find((e) => e.id === 'sprint')!, '/boards/b1')).toBe('/boards/b1');
});

test('the panel: answers with links, and the docs and contact when nothing matches', () => {
  const html = render(<HelpAnswers query="add a board" pathname="/projects/p1" />);
  expect(html).toContain('How do I add another board?');
  expect(html).toContain('href="/projects/p1/edit"');
  expect(html).toContain('Take me there');
  expect(render(<HelpAnswers query="dark mode" pathname="/" />)).not.toContain('Take me there'); // nowhere to go
  const none = render(<HelpAnswers query="xyzzy" pathname="/" />);
  expect(none).toContain('href="/docs"');
  expect(none).toContain('href="/contact"');
});
