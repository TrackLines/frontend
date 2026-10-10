import { expect, test } from 'bun:test';
import { sprintLocked, sprintStatus } from './sprint-status';

const now = new Date('2026-10-06T09:00:00Z');

test('days remaining', () => {
  expect(sprintStatus('2026-10-13T09:00:00Z', now)).toEqual({ overdue: false, label: 'ends in 7 days' });
  expect(sprintStatus('2026-10-07T10:00:00Z', now)).toEqual({ overdue: false, label: 'ends in 2 days' });
  expect(sprintStatus('2026-10-07T08:00:00Z', now).label).toBe('ends in 1 day');
});

test('overdue', () => {
  expect(sprintStatus('2026-10-06T08:59:00Z', now)).toEqual({ overdue: true, label: 'overdue — closes automatically' });
  expect(sprintStatus('2026-10-04T08:00:00Z', now)).toEqual({ overdue: true, label: 'overdue by 2 days' });
});

// dates built in local time: the lock follows the user's calendar day, whatever their zone
test('scope locks on the last local day and after', () => {
  const ends = new Date(2026, 9, 12, 18, 0).toISOString();
  expect(sprintLocked(ends, new Date(2026, 9, 11, 23, 59))).toBe(false);
  expect(sprintLocked(ends, new Date(2026, 9, 12, 0, 1))).toBe(true);
  expect(sprintLocked(ends, new Date(2026, 9, 13, 9, 0))).toBe(true); // overdue, not auto-closed yet
});
