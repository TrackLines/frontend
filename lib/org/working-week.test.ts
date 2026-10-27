import { expect, test } from 'bun:test';
import { setupI18n } from '@lingui/core';
import { businessMinutesBetween, formatDuration, timeboxBudgetMins, timeboxStatus } from '@/lib/ticket/timebox';
import { DEFAULT_WEEK, hhmm, minutes, validWeek, weekFor } from './working-week';

const i18n = setupI18n({ locale: 'en', messages: { en: {} } });
// a Sunday–Thursday week, 08:00–18:00 (10h days)
const gulf = { days: [0, 1, 2, 3, 4], week_start: 0, start_minute: 8 * 60, end_minute: 18 * 60 };

// TL-510: a ticket's week is its project's own, else the org's, else Mon–Fri 09–17
test('a project’s week: its own, the organization’s, or the default', () => {
  const weeks = { org: gulf, projects: { p1: DEFAULT_WEEK } };
  expect(weekFor(weeks, 'p1')).toBe(DEFAULT_WEEK);
  expect(weekFor(weeks, 'p2')).toBe(gulf);
  expect(weekFor(null, 'p1')).toBe(DEFAULT_WEEK);
  expect(validWeek(gulf)).toBe(true);
  for (const bad of [{ ...gulf, days: [] }, { ...gulf, days: [1, 1] }, { ...gulf, end_minute: 8 * 60 + 30 }, { ...gulf, week_start: 7 }]) expect(validWeek(bad)).toBe(false);
  expect(hhmm(9 * 60 + 5)).toBe('09:05');
  expect(minutes('17:30')).toBe(17 * 60 + 30);
  expect(Number.isNaN(minutes(''))).toBe(true);
});

test('timeboxes count the week’s days and hours; a timebox day is one working day', () => {
  const local = (d: number, h: number) => new Date(2026, 9, d, h); // October 2026, local time; the 23rd is a Friday
  // the default is as before: Fri 16:00 → Mon 10:00 is 2 hours
  expect(businessMinutesBetween(local(23, 16), local(26, 10))).toBe(120);
  // on a Sun–Thu week Friday and Saturday don't count; Sunday 08:00–10:00 does
  expect(businessMinutesBetween(local(23, 16), local(25, 10), gulf)).toBe(120);
  expect(timeboxBudgetMins(1, 2)).toBe((8 + 2) * 60);
  expect(timeboxBudgetMins(1, 2, gulf)).toBe((10 + 2) * 60);
  expect(formatDuration(i18n, 12 * 60, gulf)).toBe('1d 2h');
  expect(formatDuration(i18n, 12 * 60)).toBe('1d 4h');
  const s = timeboxStatus({ startedAt: local(25, 8), days: 1 }, local(25, 18), gulf); // a whole Sunday of a 1-day box
  expect([s.state, s.remainingMins]).toEqual(['within', 0]);
});
