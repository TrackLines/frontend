import { afterEach, expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { Mention } from '@/lib/api';
import { mentions } from '@/lib/api';
import { MentionsView, WatchToggle } from './mentions';

const m = (key: string, done: boolean): Mention => ({
  ticket_id: key, key, title: `title ${key}`, done, project_name: 'Shop', actor: 'user_sam', comment_id: 'c', mentioned_at: '2026-10-01T10:00:00Z', muted: false,
});
const people = [{ id: 'user_sam', label: 'Sam', kind: 'person' as const }];

test('the mentions page lists each ticket with who mentioned me; done ones are marked', () => {
  const html = renderToStaticMarkup(<MentionsView data={{ mentions: [m('TL-1', false), m('TL-2', true)], total: 2, page: 1, per_page: 25 }} people={people} status="all" token="tk" />);
  expect(html).toContain('href="/tickets/TL-1"');
  expect(html).toContain('Sam');
  expect(html).not.toContain('user_sam');
  expect(html.match(/>Done</g)?.length).toBe(1);
  expect(html).toContain('line-through');
});

test('empty, loading and failed say so; the filter changes the empty text', () => {
  const empty = { mentions: [], total: 0, page: 1, per_page: 25 };
  expect(renderToStaticMarkup(<MentionsView data={empty} people={people} status="all" token="tk" />)).toContain('Nobody has mentioned you yet.');
  expect(renderToStaticMarkup(<MentionsView data={empty} people={people} status="open" token="tk" />)).toContain('No open tickets mention you.');
  expect(renderToStaticMarkup(<MentionsView data={empty} people={people} status="done" token="tk" />)).toContain('No done tickets mention you.');
  expect(renderToStaticMarkup(<MentionsView data={null} people={people} status="all" token="tk" />)).toContain('Loading your mentions');
  expect(renderToStaticMarkup(<MentionsView data="failed" people={people} status="all" token="tk" />)).toContain('role="alert"');
});

// TL-588: a mouth to stop watching, a closed mouth to watch again
test('each mention has a watch toggle: a mouth while watching, a closed mouth once muted', () => {
  const html = renderToStaticMarkup(<MentionsView data={{ mentions: [m('TL-1', false), { ...m('TL-2', true), muted: true }], total: 2, page: 1, per_page: 25 }} people={people} status="all" token="tk" />);
  expect(html.match(/aria-label="Stop watching"/g)?.length).toBe(1);
  expect(html.match(/aria-label="Watch again"/g)?.length).toBe(1); // muted rows stay listed
  expect(html).toContain('lucide-mouth"');
  expect(html).toContain('lucide-mouth-off');
  expect(html).not.toContain('opacity-0'); // always shown on the page (works without hover, on phones too)
  expect(renderToStaticMarkup(<WatchToggle mention={m('TL-3', false)} token="tk" hover />)).toContain('group-hover:opacity-100');
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('muting and unmuting call the mentions API', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method} ${new URL(url).pathname}${new URL(url).search}`);
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  await mentions.mute('t1', 'tk');
  await mentions.unmute('t1', 'tk');
  await mentions.page('tk', 1, 25, 'done').catch(() => {}); // TL-590: the filter goes to the API
  await mentions.list('tk', 5, 'open').catch(() => {}); // the dashboard panel: not done only
  expect(calls).toEqual(['PUT /api/mentions/t1/mute', 'DELETE /api/mentions/t1/mute',
    'GET /api/mentions/page?page=1&per_page=25&status=done', 'GET /api/mentions?limit=5&status=open']);
});
