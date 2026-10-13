import { expect, test } from 'bun:test';
import { ApiError, type OrganizationMember, type Project, type Team } from '@/lib/api';
import { adminSource, inviteInput, inviteReady, memberName, personIn, saveError, targetName } from './organization-settings';

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
  expect(adminSource('clerk:creator', (id) => id)).toBe('initial admin: creator');
  expect(adminSource('u1', (id) => personIn(members, id))).toBe('added by Ava Smith (ava@x.io)');
});

test('a failed change explains itself', () => {
  expect(saveError('accept:i1', new ApiError(409, 'x'))).toContain('Accept the Clerk email invitation first');
  expect(saveError('accept:i1', new ApiError(403, 'x'))).toContain('Accept the Clerk email invitation first');
  expect(saveError('admin:u1', new ApiError(403, 'x'))).toBe('Only organization admins can make this change.');
  expect(saveError('admin:u1', new ApiError(409, 'You can’t remove the last admin'))).toBe('You can’t remove the last admin');
  expect(saveError('team', new Error('network'))).toBe('Couldn’t save that change. Please try again.');
});

test('invitations: the org one needs no target, team and project ones do', () => {
  expect(inviteInput(' ava@x.io ', 'organization', 't1')).toEqual({ email_address: 'ava@x.io', scope: 'organization' });
  expect(inviteInput('ava@x.io', 'team', 't1')).toEqual({ email_address: 'ava@x.io', scope: 'team', target_id: 't1' });
  expect(inviteReady('organization', '')).toBe(true);
  expect(inviteReady('project', '')).toBe(false);
  expect(inviteReady('project', 'p1')).toBe(true);
  const teams = [{ id: 't1', name: 'Platform' }] as Team[];
  const projects = [{ id: 'p1', name: 'TrackLines' }] as Project[];
  expect(targetName(teams, projects, { scope: 'team', target_id: 't1' })).toBe('Platform');
  expect(targetName(teams, projects, { scope: 'project', target_id: 'p1' })).toBe('TrackLines');
  expect(targetName(teams, projects, { scope: 'team', target_id: 'gone' })).toBe('team');
});
