import { expect, test } from 'bun:test';
import { canManageBoard, canRefine } from './board-access';

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

test('refinement is for org admins and the sprint boards’ team leaders (TL-241)', () => {
  const boards = [{ style: 'sprints', team_id: 'web' }, { style: 'kanban', team_id: 'ops' }];
  expect(canRefine({ admin: true, leads: [] }, boards)).toBe(true);
  expect(canRefine({ admin: false, leads: ['web'] }, boards)).toBe(true);
  expect(canRefine({ admin: false, leads: [] }, boards)).toBe(false); // a plain member
  expect(canRefine({ admin: false, leads: ['ops'] }, boards)).toBe(false); // leads only a kanban board
  expect(canRefine(null, boards)).toBe(false); // still loading
});

test('roadmaps are changed by org admins and leaders of a team with a board in the project (TL-413)', async () => {
  const { canManageRoadmaps } = await import('./board-access');
  const boards = [{ team_id: 'backend' }, { team_id: null }];
  expect(canManageRoadmaps({ admin: true, leads: [] }, boards)).toBe(true);
  expect(canManageRoadmaps({ admin: false, leads: ['backend'] }, boards)).toBe(true);
  expect(canManageRoadmaps({ admin: false, leads: ['design'] }, boards)).toBe(false); // leads another project's team
  expect(canManageRoadmaps({ admin: false, leads: [] }, boards)).toBe(false);
  expect(canManageRoadmaps(null, boards)).toBe(false); // still loading, or failed
});
