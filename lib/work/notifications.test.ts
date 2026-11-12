import { expect, test } from 'bun:test';
import type { AppNotification } from '../api';
import { i18nFor } from '../i18n';
import { actorName, newSince, newest, notificationHref, notificationLine, urgentToOpen } from './notifications';

const en = i18nFor('en');
const n = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n', kind: 'assigned', text: 'assigned you TL-1: Fix', actor: 'user_ava', ticket_id: 't', ticket_key: 'TL-1', board_id: null,
  created_at: '2026-10-11T10:00:00Z', read_at: null, ...over,
});
const people = [{ id: 'user_ava', label: 'Ava Smith' }, { id: 'user_me', label: 'You' }];

test('links go to the ticket (by id: keys repeat across orgs, TL-276), else the board', () => {
  expect(notificationHref(n({}))).toBe('/tickets/t');
  expect(notificationHref(n({ ticket_id: null }))).toBe('/tickets/TL-1'); // only a key: better than nothing
  expect(notificationHref(n({ ticket_id: null, ticket_key: null, board_id: 'b' }))).toBe('/boards/b');
  expect(notificationHref(n({ ticket_id: null, ticket_key: null }))).toBeNull();
});

test('actors read as names; agents by key name; unknown people as Someone', () => {
  expect(notificationLine(en, n({}), people)).toBe('Ava Smith assigned you TL-1: Fix');
  expect(actorName(en, 'Claude', people)).toBe('Claude');
  expect(actorName(en, 'user_gone', people)).toBe('Someone');
});

test('desktop popups: only unread ones newer than the last seen, oldest first', () => {
  const list = [n({ id: 'a', created_at: '2026-10-11T10:02:00Z' }), n({ id: 'b', created_at: '2026-10-11T10:01:00Z' }),
    n({ id: 'c', created_at: '2026-10-11T09:00:00Z' }), n({ id: 'd', created_at: '2026-10-11T10:03:00Z', read_at: '2026-10-11T10:04:00Z' })];
  expect(newSince(list, '2026-10-11T09:30:00Z').map((x) => x.id)).toEqual(['b', 'a']);
  expect(newest(list, null)).toBe('2026-10-11T10:03:00Z');
  expect(newest([], '2026-10-11T09:00:00Z')).toBe('2026-10-11T09:00:00Z');
});

test('a sprint that started over capacity reads as from Tracklines and opens its board (TL-149)', () => {
  const over = n({ kind: 'over_capacity', actor: 'Tracklines', ticket_id: null, ticket_key: null, board_id: 'b1',
    text: 'started sprint 2 on Backend over capacity: 8 points against a limit of 5.5 (velocity + 10%), from unfinished work carried over' });
  expect(notificationLine(en, over, people)).toBe('Tracklines started sprint 2 on Backend over capacity: 8 points against a limit of 5.5 (velocity + 10%), from unfinished work carried over');
  expect(notificationHref(over)).toBe('/boards/b1');
});

test('notices from TrackLin.es itself read as written, with no "Someone" in front (TL-424, TL-774)', () => {
  const offer = n({ kind: 'billing', actor: '', ticket_id: null, ticket_key: null, text: 'Your organization has been offered a free year of Pro. Claim it from the plan card in Settings.' });
  expect(notificationLine(en, offer, people)).toBe('Your organization has been offered a free year of Pro. Claim it from the plan card in Settings.');
  expect(notificationLine(en, n({ kind: 'legal', actor: '', text: "We've updated our Terms of service" }), people)).toBe("We've updated our Terms of service");
});

test('an unread urgent notification opens the bell until a client has; read or normal ones never (TL-883)', () => {
  const offer = n({ id: 'offer', kind: 'billing', urgent: true, ticket_id: null, ticket_key: null, link: '/settings?offer=1' });
  expect(urgentToOpen([n({}), offer])).toBe(offer);
  expect(urgentToOpen([{ ...offer, shown_at: '2026-10-11T10:30:00Z' }])).toBeUndefined(); // here, another browser or an app
  expect(urgentToOpen([{ ...offer, read_at: '2026-10-11T11:00:00Z' }])).toBeUndefined();
  expect(urgentToOpen([n({ kind: 'approval' })])).toBeUndefined(); // amber, but not urgent
});
