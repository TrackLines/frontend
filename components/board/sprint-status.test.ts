import { expect, test } from 'bun:test';
import { i18nFor } from '@/lib/i18n';
import { sprintLocked, sprintStatus } from './sprint-status';
import { dateInput, daysUntil } from './sprint-status';

// dates built in local time: days left are the user's calendar days, whatever their zone (TL-268)
const now = new Date(2026, 9, 6, 18, 0); // Tue 6 Oct, 6pm

test('days remaining count calendar days, not 24-hour blocks', () => {
  expect(sprintStatus(new Date(2026, 9, 13, 9, 0).toISOString(), i18nFor('en'), now)).toEqual({ overdue: false, label: 'ends in 7 days' });
  // 30 hours away but the day after tomorrow: the board said "2 days", the project page "tomorrow"
  expect(sprintStatus(new Date(2026, 9, 8, 0, 30).toISOString(), i18nFor('en'), now).label).toBe('ends in 2 days');
  expect(sprintStatus(new Date(2026, 9, 7, 23, 0).toISOString(), i18nFor('en'), now).label).toBe('ends tomorrow');
  expect(sprintStatus(new Date(2026, 9, 7, 8, 0).toISOString(), i18nFor('en'), now).label).toBe('ends tomorrow'); // under 24h, still tomorrow
  expect(sprintStatus(new Date(2026, 9, 6, 23, 59).toISOString(), i18nFor('en'), now).label).toBe('ends today');
});

test('overdue', () => {
  expect(sprintStatus(new Date(2026, 9, 6, 17, 0).toISOString(), i18nFor('en'), now)).toEqual({ overdue: true, label: 'overdue — closes automatically' });
  expect(sprintStatus(new Date(2026, 9, 4, 20, 0).toISOString(), i18nFor('en'), now)).toEqual({ overdue: true, label: 'overdue by 2 days' });
});

// dates built in local time: the lock follows the user's calendar day, whatever their zone
test('scope locks on the last local day and after', () => {
  const ends = new Date(2026, 9, 12, 18, 0).toISOString();
  expect(sprintLocked(ends, new Date(2026, 9, 11, 23, 59))).toBe(false);
  expect(sprintLocked(ends, new Date(2026, 9, 12, 0, 1))).toBe(true);
  expect(sprintLocked(ends, new Date(2026, 9, 13, 9, 0))).toBe(true); // overdue, not auto-closed yet
});

test('a custom sprint ends on a chosen date: its length is the local days until then', () => {
  const now = new Date(2026, 9, 17, 15, 30); // 17 Oct, mid-afternoon
  expect(daysUntil('2026-10-31', now)).toBe(14);
  expect(daysUntil('2026-10-18', now)).toBe(1);
  expect(daysUntil('2026-10-17', now)).toBe(0); // today: not a valid length
  expect(daysUntil('2026-11-02', now)).toBe(16); // across the clocks going back (25 Oct)
  expect(daysUntil('', now)).toBeNaN();
  expect(dateInput(now)).toBe('2026-10-17');
});
