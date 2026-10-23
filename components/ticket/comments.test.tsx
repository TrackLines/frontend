import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { CommentList, TicketComments } from './comments';
import type { TicketComment } from '@/lib/api';

const c = (id: string, body: string, parent: string | null = null): TicketComment =>
  ({ id, ticket_id: 't', parent_comment_id: parent, body, author: 'Sam', created_at: '2026-10-01T10:00:00Z' });

test('the conversation threads replies under their comment, with Reply when replying is allowed', () => {
  const html = renderToStaticMarkup(<CommentList comments={[c('a', 'first'), c('b', 'reply to first', 'a'), c('d', '**second**')]} onReply={() => {}} />);
  expect(html.indexOf('first')).toBeLessThan(html.indexOf('reply to first'));
  expect(html).toContain('<strong>second</strong>');
  expect(html.match(/>Reply</g)?.length).toBe(3);
  expect(html).toContain('ml-3'); // the reply is indented
  expect(renderToStaticMarkup(<CommentList comments={[c('a', 'first')]} />)).not.toContain('Reply');
});

test('the comment box: loading first, @mentions on, posting needs text', () => {
  const html = renderToStaticMarkup(<TicketComments ticketId="t" token="tok" />);
  for (const s of ['Conversation', 'Add a comment', 'aria-autocomplete="list"', '0/10000']) expect(html).toContain(s);
  expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*>Post comment/);
});

test('comment authors are named from the people list, not all "You"', () => {
  const people = [{ id: 'user_me', label: 'You', kind: 'person' as const }, { id: 'user_bo', label: 'Bo Jones', kind: 'person' as const }];
  const html = renderToStaticMarkup(<CommentList people={people} comments={[{ ...c('a', 'mine'), author: 'user_me' }, { ...c('b', 'theirs'), author: 'user_bo' }]} />);
  expect(html).toContain('>You<');
  expect(html).toContain('>Bo Jones<');
});
