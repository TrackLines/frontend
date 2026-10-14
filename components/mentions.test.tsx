import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Mention } from '@/lib/api';
import { MentionsView } from './mentions';

const m = (key: string, done: boolean): Mention => ({
  ticket_id: key, key, title: `title ${key}`, done, project_name: 'Shop', actor: 'user_sam', comment_id: 'c', mentioned_at: '2026-10-01T10:00:00Z',
});
const people = [{ id: 'user_sam', label: 'Sam', kind: 'person' as const }];

test('the mentions page lists each ticket with who mentioned me; done ones are marked', () => {
  const html = renderToStaticMarkup(<MentionsView data={{ mentions: [m('TL-1', false), m('TL-2', true)], total: 2, page: 1, per_page: 25 }} people={people} hideDone={false} />);
  expect(html).toContain('href="/tickets/TL-1"');
  expect(html).toContain('Sam');
  expect(html).not.toContain('user_sam');
  expect(html.match(/>Done</g)?.length).toBe(1);
  expect(html).toContain('line-through');
});

test('empty, loading and failed say so; hiding done changes the empty text', () => {
  const empty = { mentions: [], total: 0, page: 1, per_page: 25 };
  expect(renderToStaticMarkup(<MentionsView data={empty} people={people} hideDone={false} />)).toContain('Nobody has mentioned you yet.');
  expect(renderToStaticMarkup(<MentionsView data={empty} people={people} hideDone />)).toContain('No open tickets mention you.');
  expect(renderToStaticMarkup(<MentionsView data={null} people={people} hideDone={false} />)).toContain('Loading your mentions');
  expect(renderToStaticMarkup(<MentionsView data="failed" people={people} hideDone={false} />)).toContain('role="alert"');
});
