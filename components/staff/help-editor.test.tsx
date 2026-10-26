import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { HelpForm, HelpList, missing, moved, problems } from './help-editor';
import { staff, type HelpAnswer, type HelpAnswerInput } from '@/lib/api';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const all = { en: 'How?', nl: 'Hoe?', de: 'Wie?', es: '¿Cómo?', pt: 'Como?', fr: 'Comment ?', tlh: 'chay’?' };
const answer = (o: Partial<HelpAnswer> = {}): HelpAnswer => ({
  id: 'h1', slug: 'add-board', question: { ...all }, answer: { ...all }, href: '/projects/[project]/edit', fallback_href: '', pages: ['project'],
  words: 'new board', position: 0, published: true, updated_by: 'u', updated_at: '2026-10-26T12:00:00Z', ...o,
});
const input = (o: Partial<HelpAnswerInput> = {}): HelpAnswerInput => ({ slug: 'x', question: { en: 'q' }, answer: { en: 'a' }, href: '', fallback_href: '', pages: [], words: '', published: true, ...o });

test('a form is checked as the backend checks it: slug, English, and links that stay in the app (TL-579)', () => {
  expect(problems(input())).toEqual([]);
  expect(problems(input({ slug: 'Bad Slug' }))).toEqual(['slug']);
  expect(problems(input({ question: { nl: 'v' } }))).toEqual(['english']);
  expect(problems(input({ href: 'https://evil.example' }))).toEqual(['href']);
  expect(problems(input({ fallback_href: '//evil.example' }))).toEqual(['fallback']);
  expect(problems(input({ href: '/boards/[board]?view=next' }))).toEqual([]);
});

test('the languages still missing, and moving an answer', () => {
  expect(missing(input())).toEqual(['nl', 'de', 'es', 'pt', 'fr', 'tlh']);
  expect(missing({ question: { ...all }, answer: { ...all, de: ' ' } })).toEqual(['de']);
  expect(moved(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  expect(moved(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
  expect(moved(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
});

test('the list: hidden and untranslated answers say so; the first can’t go up', () => {
  const html = render(<HelpList busy={false} onMove={() => {}} onEdit={() => {}} onDelete={() => {}}
    list={[answer(), answer({ id: 'h2', slug: 'theme', published: false, question: { en: 'Dark mode?' }, answer: { en: 'Yes' } })]} />).replace(/<!-- -->/g, '');
  for (const s of ['How?', 'add-board', 'Dark mode?', 'Hidden', 'Not translated: nl, de, es, pt, fr, tlh', '>Edit<', '>Delete<']) expect(html).toContain(s);
  expect(html.match(/<button[^>]* disabled=""[^>]*aria-label="Move up"/g)?.length).toBe(1); // the first
  expect(html.match(/<button[^>]* disabled=""[^>]*aria-label="Move down"/g)?.length).toBe(1); // the last
  expect(html.split('data-missing').length - 1).toBe(1);
});

test('the form: a tab per language, the missing ones warned, page kinds, and a preview of the panel', () => {
  const html = render(<HelpForm initial={answer({ answer: { ...all, nl: '' } })} onSave={async () => {}} onCancel={() => {}} />).replace(/<!-- -->/g, '');
  for (const s of ['English', 'Nederlands •', 'tlhIngan Hol', 'Not translated yet: Nederlands. People reading those see the English.', 'Project', 'Your settings',
    'Suggested on', 'Published: shown in the help panel', 'Preview (English)', 'How?', 'Take me there', 'href="/dashboard"']) {
    expect(html).toContain(s);
  }
});

test('staff edits go to the staff routes', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await staff.help('t');
  await staff.addHelp(input(), 't');
  await staff.updateHelp('h1', input({ slug: 'y' }), 't');
  await staff.orderHelp(['h2', 'h1'], 't');
  await staff.deleteHelp('h1', 't');
  expect(asked.map((a) => a.split(' {')[0])).toEqual(['GET /staff/help', 'POST /staff/help', 'PUT /staff/help/h1', 'PUT /staff/help/order', 'DELETE /staff/help/h1']);
  expect(asked[3]).toContain('{"ids":["h2","h1"]}');
});
