import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { ReceivedInvitations, TeamEditor } from './organization';
import type { Invitation, OrganizationMember, Project, Team } from '@/lib/api';

const team = { id: 't1', name: 'Platform', description: 'APIs' } as Team;
const people: OrganizationMember[] = [{ user_id: 'u1', first_name: 'Ava', identifier: 'ava@x.io' }, { user_id: 'u2', identifier: 'bo@x.io' }];
const projects = [{ id: 'p1', name: 'TrackLines' }, { id: 'p2', name: 'Docs' }] as Project[];
const editor = (isAdmin: boolean) => renderToStaticMarkup(<TeamEditor team={team} members={[{ user_id: 'u1', leader: true }]} people={people} projects={projects}
  projectTeams={{ p1: [team] }} isAdmin={isAdmin} token="tok" busy="" person={(id) => id === 'u1' ? 'Ava' : id} onChange={() => {}} />);

test('admins edit a team: name, members, leaders, project links', () => {
  const html = editor(true);
  for (const s of ['aria-label="Platform team name"', '>Save<', '>Delete<', 'Ava', 'Leader', 'Remove leader', 'Add member to Platform', 'Boards linked to this team are managed by its leaders.']) expect(html).toContain(s);
  expect(html).toMatch(/aria-pressed="true"[^>]*>Linked</);
  expect(html).toMatch(/aria-pressed="false"[^>]*>Link team</);
});

test('everyone else sees the team read-only', () => {
  const html = editor(false);
  expect(html).toContain('<h3 class="font-semibold">Platform</h3>');
  for (const never of ['>Save<', '>Delete<', 'Remove leader', 'Add member to']) expect(html).not.toContain(never);
  // the projects it's on, as text: no buttons that look like they'd change anything (TL-241)
  expect(html).toContain('<li>TrackLines</li>');
  expect(html).not.toContain('<button');
});

test('invitations for me: accept in Clerk, then complete here; nothing when there are none', () => {
  const invite = { id: 'i1', scope: 'team', accept_url: 'https://clerk.example/accept', expires_at: '2026-10-20T00:00:00Z' } as Invitation;
  const html = renderToStaticMarkup(<ReceivedInvitations items={[invite]} token="tok" run={async () => {}} />);
  for (const s of ['Invitations for you', 'team invitation', 'href="https://clerk.example/accept"', 'Complete acceptance']) expect(html).toContain(s);
  expect(renderToStaticMarkup(<ReceivedInvitations items={[]} token="tok" run={async () => {}} />)).toBe('');
});

test('a change’s result shows only in its own section: success as a status, failure as an alert', async () => {
  const { OutcomeNote } = await import('./organization');
  const sent = { section: 'invites' as const, ok: true, text: 'Invitation sent to ava@x.io.' };
  expect(renderToStaticMarkup(<OutcomeNote outcome={sent} section="invites" />)).toMatch(/role="status"[^>]*>Invitation sent to ava@x.io./);
  expect(renderToStaticMarkup(<OutcomeNote outcome={sent} section="members" />)).toBe('');
  expect(renderToStaticMarkup(<OutcomeNote outcome={null} section="invites" />)).toBe('');
  const failed = { section: 'invites' as const, ok: false, text: 'Only organization admins can make this change.' };
  expect(renderToStaticMarkup(<OutcomeNote outcome={failed} section="invites" />)).toMatch(/role="alert"/);
});

test('the add-member picker shows its label, not a raw value (TL-581)', () => {
  const html = editor(true);
  expect(html).toMatch(/data-slot="select-value"[^>]*>Add organization member…</);
  expect(html).not.toMatch(/data-slot="select-value"[^>]*>__none</);
});
