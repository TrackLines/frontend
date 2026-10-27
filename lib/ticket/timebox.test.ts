import { expect, test } from 'bun:test';
import { i18nFor } from '@/lib/i18n';
import { businessMinutesBetween, formatDuration, timeboxBudgetMins, timeboxStatus } from './timebox';

// Dates are built with local constructors so the tests are timezone-independent: 2026-01-05 is a
// Monday, 2026-01-09 a Friday, 2026-01-12 the next Monday.
const at = (day: number, hour: number, min = 0) => new Date(2026, 0, day, hour, min);

test('timeboxBudgetMins treats a day as 8 business hours', () => {
  expect(timeboxBudgetMins(1, 4)).toBe(720); // 8h + 4h
  expect(timeboxBudgetMins(0, 6)).toBe(360);
  expect(timeboxBudgetMins(null, null)).toBe(0);
});

test('businessMinutesBetween counts only Mon–Fri 09:00–17:00', () => {
  expect(businessMinutesBetween(at(5, 10), at(5, 15))).toBe(300); // Mon 10–15
  expect(businessMinutesBetween(at(5, 8), at(5, 18))).toBe(480); // clamped to 09–17 = 8h
  expect(businessMinutesBetween(at(9, 16), at(12, 10))).toBe(120); // Fri 16–17 + Mon 09–10, weekend skipped
  expect(businessMinutesBetween(at(10, 9), at(11, 17))).toBe(0); // all weekend (Sat–Sun)
  expect(businessMinutesBetween(at(5, 12), at(5, 12))).toBe(0); // zero span
});

test('timeboxStatus: not started, within, over', () => {
  expect(timeboxStatus({ days: 1, hours: 0 }).state).toBe('not_started');

  // started Mon 09:00, done Mon 10:00, 1-day budget → within, 7h spare
  const within = timeboxStatus({ startedAt: at(5, 9).toISOString(), doneAt: at(5, 10).toISOString(), days: 1, hours: 0 });
  expect(within.state).toBe('within');
  expect(within.elapsedMins).toBe(60);
  expect(within.remainingMins).toBe(420);

  // started Mon 09:00, 1-hour budget, now Mon 11:00 → over by 1h
  const over = timeboxStatus({ startedAt: at(5, 9).toISOString(), days: 0, hours: 1 }, at(5, 11));
  expect(over.state).toBe('over');
  expect(over.remainingMins).toBe(-60);
});

test('formatDuration renders business time compactly', () => {
  expect(formatDuration(i18nFor('en'), 420)).toBe('7h');
  expect(formatDuration(i18nFor('en'), 90)).toBe('1h 30m');
  expect(formatDuration(i18nFor('en'), 480)).toBe('1d');
  expect(formatDuration(i18nFor('en'), 540)).toBe('1d 1h');
  expect(formatDuration(i18nFor('en'), 45)).toBe('45m');
  expect(formatDuration(i18nFor('en'), 0)).toBe('0m');
});
