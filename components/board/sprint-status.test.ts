import { expect, test } from 'bun:test';
import { sprintLocked, sprintStatus } from './sprint-status';

// dates built in local time: days left are the user's calendar days, whatever their zone (TL-268)
const now = new Date(2026, 9, 6, 18, 0); // Tue 6 Oct, 6pm

test('days remaining count calendar days, not 24-hour blocks', () => {
  expect(sprintStatus(new Date(2026, 9, 13, 9, 0).toISOString(), now)).toEqual({ overdue: false, label: 'ends in 7 days' });
  // 30 hours away but the day after tomorrow: the board said "2 days", the project page "tomorrow"
  expect(sprintStatus(new Date(2026, 9, 8, 0, 30).toISOString(), now).label).toBe('ends in 2 days');
  expect(sprintStatus(new Date(2026, 9, 7, 23, 0).toISOString(), now).label).toBe('ends tomorrow');
  expect(sprintStatus(new Date(2026, 9, 7, 8, 0).toISOString(), now).label).toBe('ends tomorrow'); // under 24h, still tomorrow
  expect(sprintStatus(new Date(2026, 9, 6, 23, 59).toISOString(), now).label).toBe('ends today');
});

test('overdue', () => {
  expect(sprintStatus(new Date(2026, 9, 6, 17, 0).toISOString(), now)).toEqual({ overdue: true, label: 'overdue — closes automatically' });
  expect(sprintStatus(new Date(2026, 9, 4, 20, 0).toISOString(), now)).toEqual({ overdue: true, label: 'overdue by 2 days' });
});

// dates built in local time: the lock follows the user's calendar day, whatever their zone
test('scope locks on the last local day and after', () => {
  const ends = new Date(2026, 9, 12, 18, 0).toISOString();
  expect(sprintLocked(ends, new Date(2026, 9, 11, 23, 59))).toBe(false);
  expect(sprintLocked(ends, new Date(2026, 9, 12, 0, 1))).toBe(true);
  expect(sprintLocked(ends, new Date(2026, 9, 13, 9, 0))).toBe(true); // overdue, not auto-closed yet
});
