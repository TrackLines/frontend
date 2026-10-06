import { expect, test } from 'bun:test';
import type { TicketComment } from '@/lib/api';
import { commentThread } from './comment-thread';

const c = (id: string, parent: string | null, created_at: string): TicketComment => ({
  id, ticket_id: 'ticket', parent_comment_id: parent, body: id, author: 'codex', created_at,
});

test('nests replies under their parent and keeps siblings chronological', () => {
  const tree = commentThread([
    c('reply-late', 'root', '2026-10-06T10:02:00Z'),
    c('other', null, '2026-10-06T10:03:00Z'),
    c('root', null, '2026-10-06T10:00:00Z'),
    c('reply-early', 'root', '2026-10-06T10:01:00Z'),
  ]);

  expect(tree.map((n) => n.comment.id)).toEqual(['root', 'other']);
  expect(tree[0].replies.map((n) => n.comment.id)).toEqual(['reply-early', 'reply-late']);
});

test('keeps comments with missing parents visible as roots', () => {
  expect(commentThread([c('orphan', 'missing', '2026-10-06T10:00:00Z')]).map((n) => n.comment.id)).toEqual(['orphan']);
});
