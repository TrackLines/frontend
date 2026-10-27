import { expect, test } from 'bun:test';
import type { HostedSession } from '../api';
import { applyHosted, followedFilters, followedTicket, refineLabel, roleIn } from './hosted';

const session: HostedSession = { host: 'ava', startedAt: 1, focus: { ticketId: 't1', filters: { labels: ['ui'] } }, people: ['ava', 'bo'] };

test('roles: the host, a follower once joined, otherwise outside', () => {
  expect(roleIn(session, 'ava', false)).toBe('host');
  expect(roleIn(session, 'bo', true)).toBe('follower');
  expect(roleIn(session, 'bo', false)).toBe('outside');
  expect(roleIn(null, 'bo', true)).toBe('outside');
  expect(roleIn(session, null, true)).toBe('outside');
});

test('live events replace the session, end it, or leave it alone', () => {
  const next = { ...session, host: 'bo' };
  expect(applyHosted(session, { id: 2, type: 'refinement-session', payload: next }, 'refinement')).toEqual(next);
  expect(applyHosted(session, { id: 3, type: 'refinement-session-ended' }, 'refinement')).toBeNull();
  expect(applyHosted(session, { id: 4, type: 'standup-session', payload: next }, 'refinement')).toBe(session); // another kind
  expect(applyHosted(session, { id: 5, type: 'refinement-session', payload: { nonsense: true } }, 'refinement')).toBe(session);
  expect(applyHosted(session, { id: 6, type: 'refinement' }, 'refinement')).toBe(session); // plan changes aren't session changes
});

test('followers who are following see the host’s ticket and filters; nobody else does', () => {
  expect(followedTicket(session, 'follower', true)).toBe('t1');
  expect(followedTicket(session, 'follower', false)).toBeNull();
  expect(followedTicket(session, 'host', true)).toBeNull();
  expect(followedTicket(session, 'outside', true)).toBeNull();
  expect(followedFilters(session, 'follower', true)).toEqual({ labels: ['ui'] });
  expect(followedFilters(session, 'follower', false)).toBeNull();
  expect(followedFilters({ ...session, focus: { ticketId: null } }, 'follower', true)).toEqual({});
});

test('the Refine button: start one, or join the one running', () => {
  expect(refineLabel(null)).toBe('Refine');
  expect(refineLabel(session)).toBe('Join refinement');
});
