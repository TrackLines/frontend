import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { AppNotification } from '@/lib/api';
import { NotificationsList } from './notifications-bell';

const n = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1', kind: 'assigned', text: 'assigned you TL-1: Fix login', actor: 'user_ava', ticket_id: 't', ticket_key: 'TL-1', board_id: null,
  created_at: '2026-10-11T10:00:00Z', read_at: null, ...over,
});
const view = (props: Partial<Parameters<typeof NotificationsList>[0]>) => renderToStaticMarkup(
  <NotificationsList items={[]} people={[{ id: 'user_ava', label: 'Ava Smith' }]} failed={false} unread={0} onOpen={() => {}} onReadAll={() => {}} {...props} />,
);

const read = n({ id: 'n2', actor: 'Claude', kind: 'review', text: 'finished TL-2: X, and it needs your review', read_at: '2026-10-11T11:00:00Z' });

test('the bell shows unread ones, with who did it and a clear button; read ones are hidden', () => {
  const html = view({ items: [n({}), read], unread: 1, onDismiss: () => {}, onShowRead: () => {} });
  expect(html).toContain('Ava Smith assigned you TL-1: Fix login');
  expect(html).not.toContain('Claude finished TL-2');
  expect(html).toContain('aria-label="Clear: Ava Smith assigned you TL-1: Fix login"');
  expect(html).toContain('Mark all read');
  expect(html).toContain('Show read (1)');
  expect(html).not.toContain('Clear read');
});

test('showing read ones offers Clear read', () => {
  const html = view({ items: [n({}), read], unread: 1, showRead: true, onShowRead: () => {}, onClearRead: () => {} });
  expect(html).toContain('Claude finished TL-2: X, and it needs your review');
  expect(html.match(/aria-label="Unread"/g)?.length).toBe(1);
  expect(html).toContain('Hide read');
  expect(html).toContain('Clear read');
});

test('only read ones left: caught up, no Mark all read', () => {
  const html = view({ items: [read], onShowRead: () => {} });
  expect(html).toContain('all caught up');
  expect(html).not.toContain('Mark all read');
});

test('loading, error and empty states', () => {
  expect(view({ items: null })).toContain('Loading…');
  expect(view({ failed: true })).toContain('Couldn&#x27;t load notifications');
  expect(view({ items: [] })).toContain('all caught up');
});

test('Notify me on this device: off, on, blocked; nothing when push is not available', async () => {
  const { PushControl } = await import('./notifications-bell');
  const off = renderToStaticMarkup(<PushControl state="off" busy={false} onToggle={() => {}} />);
  expect(off).toContain('Notify me on this device');
  expect(off).toContain('>Turn on<');
  const on = renderToStaticMarkup(<PushControl state="on" busy={false} onToggle={() => {}} />);
  expect(on).toContain('even when TrackLin.es is closed');
  expect(on).toContain('>Turn off<');
  expect(on).toContain('aria-pressed="true"');
  expect(renderToStaticMarkup(<PushControl state="blocked" busy={false} onToggle={() => {}} />)).toContain('blocked for this site');
  expect(renderToStaticMarkup(<PushControl state="unavailable" busy={false} onToggle={() => {}} />)).toBe('');
});

test('each notification shows its type\'s icon (TL-280)', () => {
  const html = view({ items: [
    { id: '1', kind: 'assigned', text: 'assigned you TL-1', actor: 'user_ava', ticket_id: 't', ticket_key: 'TL-1', board_id: null, created_at: '2026-10-11T10:00:00Z', read_at: null },
    { id: '2', kind: 'over_capacity', text: 'started sprint 2 over capacity', actor: 'Tracklines', ticket_id: null, ticket_key: null, board_id: 'b', created_at: '2026-10-11T09:00:00Z', read_at: null },
  ], unread: 2 });
  expect(html).toContain('data-kind="assigned"');
  expect(html).toContain('data-kind="over_capacity"');
});

test('settings are a cog by the heading, not a line at the bottom', () => {
  const html = view({ settings: true });
  expect(html).toContain('aria-label="Notification settings"');
  expect(html).toContain('href="/account"');
  expect(html).not.toContain('Notification settings: this device');
  expect(html.indexOf('Notification settings')).toBeLessThan(html.indexOf('all caught up'));
  expect(view({})).not.toContain('href="/account"'); // the list on its own has no cog
});
