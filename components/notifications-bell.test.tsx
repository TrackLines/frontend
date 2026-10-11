import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AppNotification } from '@/lib/api';
import { NotificationsList } from './notifications-bell';

const n = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1', kind: 'assigned', text: 'assigned you TL-1: Fix login', actor: 'user_ava', ticket_id: 't', ticket_key: 'TL-1', board_id: null,
  created_at: '2026-10-11T10:00:00Z', read_at: null, ...over,
});
const view = (props: Partial<Parameters<typeof NotificationsList>[0]>) => renderToStaticMarkup(
  <NotificationsList items={[]} people={[{ id: 'user_ava', label: 'Ava Smith' }]} failed={false} unread={0} onOpen={() => {}} onReadAll={() => {}} {...props} />,
);

test('lists notifications with who did it; unread ones are marked', () => {
  const html = view({ items: [n({}), n({ id: 'n2', actor: 'Claude', kind: 'review', text: 'finished TL-2: X, and it needs your review', read_at: '2026-10-11T11:00:00Z' })], unread: 1 });
  expect(html).toContain('Ava Smith assigned you TL-1: Fix login');
  expect(html).toContain('Claude finished TL-2: X, and it needs your review');
  expect(html.match(/aria-label="Unread"/g)?.length).toBe(1);
  expect(html).toContain('Mark all read');
});

test('nothing unread: no Mark all read', () => {
  expect(view({ items: [n({ read_at: '2026-10-11T11:00:00Z' })] })).not.toContain('Mark all read');
});

test('loading, error and empty states', () => {
  expect(view({ items: null })).toContain('Loading…');
  expect(view({ failed: true })).toContain('Couldn&#x27;t load notifications');
  expect(view({ items: [] })).toContain('all caught up');
});
