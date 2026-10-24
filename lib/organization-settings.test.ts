import { expect, test } from 'bun:test';
import { i18nFor } from '@/lib/i18n';
import { ApiError, type OrganizationMember, type Project, type Team } from '@/lib/api';
import { adminSource, fetchOrganization, inviteInput, inviteReady, memberName, personIn, saveError, sectionOf, targetName } from './organization-settings';

const i18n = i18nFor('en');

const members: OrganizationMember[] = [
  { user_id: 'u1', first_name: 'Ava', last_name: 'Smith', identifier: 'ava@x.io' },
  { user_id: 'u2', identifier: 'bo@x.io' },
];

test('people read by name and email, by email alone, or by id once they have left', () => {
  expect(memberName(members[0])).toBe('Ava Smith');
  expect(memberName(members[1])).toBe('bo@x.io');
  expect(personIn(members, 'u1')).toBe('Ava Smith (ava@x.io)');
  expect(personIn(members, 'u2')).toBe('bo@x.io');
  expect(personIn(members, 'u9')).toBe('u9');
  expect(adminSource(i18n, 'clerk:creator', (id) => id)).toBe('initial admin: creator');
  expect(adminSource(i18n, 'u1', (id) => personIn(members, id))).toBe('added by Ava Smith (ava@x.io)');
});

test('a failed change explains itself', () => {
  expect(saveError(i18n, 'accept:i1', new ApiError(409, 'x'))).toContain('Accept the Clerk email invitation first');
  expect(saveError(i18n, 'accept:i1', new ApiError(403, 'x'))).toContain('Accept the Clerk email invitation first');
  expect(saveError(i18n, 'admin:u1', new ApiError(403, 'x'))).toBe('Only organization admins can make this change.');
  expect(saveError(i18n, 'admin:u1', new ApiError(409, 'You can’t remove the last admin'))).toBe('You can’t remove the last admin');
  expect(saveError(i18n, 'team', new Error('network'))).toBe('Couldn’t save that change. Please try again.');
});

test('invitations: the org one needs no target, team and project ones do', () => {
  expect(inviteInput(' ava@x.io ', 'organization', 't1')).toEqual({ email_address: 'ava@x.io', scope: 'organization' });
  expect(inviteInput('ava@x.io', 'team', 't1')).toEqual({ email_address: 'ava@x.io', scope: 'team', target_id: 't1' });
  expect(inviteReady('organization', '')).toBe(true);
  expect(inviteReady('project', '')).toBe(false);
  expect(inviteReady('project', 'p1')).toBe(true);
  const teams = [{ id: 't1', name: 'Platform' }] as Team[];
  const projects = [{ id: 'p1', name: 'TrackLines' }] as Project[];
  expect(targetName(i18n, teams, projects, { scope: 'team', target_id: 't1' })).toBe('Platform');
  expect(targetName(i18n, teams, projects, { scope: 'project', target_id: 'p1' })).toBe('TrackLines');
  expect(targetName(i18n, teams, projects, { scope: 'team', target_id: 'gone' })).toBe('team');
});

test('each change reports in the section that made it, so its result is on screen (TL-220)', () => {
  expect(sectionOf('invite')).toBe('invites');
  expect(sectionOf('revoke:i1')).toBe('invites');
  expect(sectionOf('accept:i1')).toBe('received');
  expect(sectionOf('admin:u1')).toBe('members');
  expect(sectionOf('create-team')).toBe('teams');
  expect(sectionOf('t1:member')).toBe('teams');
});

test('when Clerk refuses an invitation, the admin sees why (TL-239)', () => {
  const why = 'Clerk refused to create organization invitation: invitations are only supported on instances that accept email addresses.';
  expect(saveError(i18n, 'invite', new ApiError(422, why))).toBe(why);
  expect(saveError(i18n, 'invite', new ApiError(502, 'could not create organization invitation'))).toBe('Couldn’t save that change. Please try again.');
});

test('the organization page loads without waiting for invitations, and fetches in parallel (TL-263)', async () => {
  const never = new Promise<never>(() => {});
  const calls: string[] = [];
  let releaseMembers!: () => void;
  const membersGate = new Promise<void>((r) => { releaseMembers = r; });
  const api = {
    organization: {
      me: async () => ({ admin: true, user_id: 'u1', leads: [] }),
      members: async () => { calls.push('members'); await membersGate; return { members: [{ user_id: 'u1' }], total_count: 1, limit: 100, offset: 0 }; },
      admins: async () => [],
    },
    teams: {
      list: async () => [{ id: 't1' }],
      members: async () => { calls.push('team-members'); return []; },
      projectTeams: async () => { calls.push('project-teams'); return []; },
    },
    projects: { list: async () => [{ id: 'p1' }] },
    invitations: { mine: () => never, list: () => never },
  } as unknown as Parameters<typeof fetchOrganization>[1];

  const { data } = fetchOrganization('tok', api);
  await new Promise((r) => setTimeout(r, 0));
  // team and project details started while members were still loading
  expect(calls).toEqual(expect.arrayContaining(['members', 'team-members', 'project-teams']));
  releaseMembers();
  const got = await Promise.race([data, new Promise((r) => setTimeout(() => r('waited on invitations'), 100))]);
  expect(got).not.toBe('waited on invitations');
  expect((got as { isAdmin: boolean }).isAdmin).toBe(true);
});

test('the Members heading shows the plan’s limit, counting pending invitations; a 402 says why (TL-419)', async () => {
  const { memberCount, saveError } = await import('./organization-settings');
  const { ApiError } = await import('./api');
  expect(memberCount(i18n, 12, 1, 20)).toBe('12 members and 1 invitation pending, of up to 20 on your plan');
  expect(memberCount(i18n, 1, 0, 20)).toBe('1 member, of up to 20 on your plan');
  expect(memberCount(i18n, 40, 2, -1)).toBe('40 members'); // Enterprise
  expect(memberCount(i18n, 3, 0, null)).toBe('3 members'); // limit not known yet
  expect(saveError(i18n, 'invite', new ApiError(402, 'limit'))).toContain('up to 20 members');
  expect(saveError(i18n, 'invite', new ApiError(402, 'limit'))).toContain('Upgrade to Enterprise');
});
