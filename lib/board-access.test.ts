import { expect, test } from 'bun:test';
import { canManageBoard } from './board-access';

test('organization admins can manage linked and unlinked boards', () => {
  expect(canManageBoard({ admin: true, leads: [] }, null)).toBe(true);
  expect(canManageBoard({ admin: true, leads: [] }, 'team-a')).toBe(true);
});

test('only leaders assigned to the board team can manage it', () => {
  expect(canManageBoard({ admin: false, leads: ['team-a'] }, 'team-a')).toBe(true);
  expect(canManageBoard({ admin: false, leads: ['team-a'] }, 'team-b')).toBe(false);
  expect(canManageBoard({ admin: false, leads: ['team-a'] }, null)).toBe(false);
  expect(canManageBoard({ admin: false, leads: [] }, 'team-a')).toBe(false);
});
