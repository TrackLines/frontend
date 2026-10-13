import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { HostedSession } from '@/lib/api';

mockDialog();
const { renderToStaticMarkup } = await import('react-dom/server');
const { FollowedTicket, HostedActions, HostedBar, HostedPeople } = await import('./hosted-bar');

const session: HostedSession = { host: 'user_ava', startedAt: 1, focus: { ticketId: 't1' }, people: ['user_ava', 'user_bo', 'user_cy'] };
const people = [{ id: 'user_ava', label: 'Ava', kind: 'person' as const }, { id: 'user_bo', label: 'You', kind: 'person' as const }, { id: 'user_cy', label: 'Cy', kind: 'person' as const }];
const props = (role: 'host' | 'follower', following = true) => ({ session, role, following, people, noun: 'refinement', onFollow: () => {}, onLeave: () => {}, onEnd: () => {}, onHandOver: () => {} });
const bar = (role: 'host' | 'follower', following = true) => renderToStaticMarkup(<HostedActions {...props(role, following)} />) + renderToStaticMarkup(
  <HostedPeople session={session} role={role} following={following} people={people} noun="refinement" onFollow={() => {}} onLeave={() => {}} onEnd={() => {}} onHandOver={() => {}} />);

test('the page only gets a small button: who hosts and how many are here', () => {
  expect(renderToStaticMarkup(<HostedBar {...props('follower')} />)).toContain('Ava is hosting · 3 here');
  expect(renderToStaticMarkup(<HostedBar {...props('host')} />)).toContain('You’re hosting · 3 here');
});

test('the drawer lists everyone here, host marked', () => {
  const html = bar('follower');
  for (const s of ['aria-label="Host"', '> Ava<', '>Cy<']) expect(html).toContain(s);
});

test('the host can end the session and hand it over; followers can’t', () => {
  const host = bar('host');
  for (const s of ['End refinement', 'Make Cy the host']) expect(host).toContain(s);
  expect(host).not.toContain('Leave');
  const follower = bar('follower');
  expect(follower).not.toContain('End refinement');
  expect(follower).not.toContain('Make host');
});

test('followers can stop following and come back, and leave', () => {
  expect(bar('follower')).toContain('Stop following');
  expect(bar('follower', false)).toContain('Follow host');
  expect(bar('follower')).toContain('>Leave refinement<');
});

test('the host’s ticket opens read-only for followers: no edit, comments or attachments', () => {
  const known = { id: 't1', key: 'TL-1', column_id: 'c', position: 0, title: 'Fix login', description: 'details', created_by: 'x', column_name: 'In progress' };
  const html = renderToStaticMarkup(<FollowedTicket ticketId="t1" token="tok" known={known} onDismiss={() => {}} />);
  for (const s of ['Fix login', 'In progress', 'details']) expect(html).toContain(s);
  for (const never of ['>Edit<', 'Conversation', 'Attachments', 'Add a comment']) expect(html).not.toContain(never);
  expect(renderToStaticMarkup(<FollowedTicket ticketId={null} token="tok" known={known} onDismiss={() => {}} />)).toBe('');
});
