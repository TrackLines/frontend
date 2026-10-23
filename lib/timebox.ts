import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// Spike timebox tracking (TL-506): how much of a spike's timebox is used, in business hours.
// ponytail: working week hard-coded to Mon–Fri 09:00–17:00 (8h/day) in the viewer's local timezone;
// TL-510 will make it configurable. A "day" of timebox is a business day = WORK_HOURS_PER_DAY hours.

export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 17;
export const WORK_HOURS_PER_DAY = WORK_END_HOUR - WORK_START_HOUR; // 8

const isWorkday = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5; // Mon(1)–Fri(5), local

export type TimeboxState = 'not_started' | 'within' | 'over';
export type TimeboxStatus = { state: TimeboxState; budgetMins: number; elapsedMins: number; remainingMins: number };

// timeboxBudgetMins: a days+hours timebox as minutes of business time.
export function timeboxBudgetMins(days?: number | null, hours?: number | null): number {
  return ((days ?? 0) * WORK_HOURS_PER_DAY + (hours ?? 0)) * 60;
}

// businessMinutesBetween: minutes of [start, end] that fall inside the working week (Mon–Fri
// 09:00–17:00, local). Weekends and nights don't count, so the clock is frozen outside work hours.
export function businessMinutesBetween(start: Date, end: Date): number {
  if (!(end.getTime() > start.getTime())) return 0;
  let total = 0;
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; i < 4000 && day.getTime() <= end.getTime(); i++) {
    if (isWorkday(day)) {
      const ws = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WORK_START_HOUR).getTime();
      const we = new Date(day.getFullYear(), day.getMonth(), day.getDate(), WORK_END_HOUR).getTime();
      const os = Math.max(start.getTime(), ws);
      const oe = Math.min(end.getTime(), we);
      if (oe > os) total += (oe - os) / 60000;
    }
    day.setDate(day.getDate() + 1);
  }
  return Math.round(total);
}

// timeboxStatus: where a spike stands against its timebox. Elapsed runs from startedAt to doneAt (or
// now while open); not_started before it enters In Progress. remainingMins is negative when over.
export function timeboxStatus(
  t: { startedAt?: string | Date | null; doneAt?: string | Date | null; days?: number | null; hours?: number | null },
  now: Date = new Date(),
): TimeboxStatus {
  const budgetMins = timeboxBudgetMins(t.days, t.hours);
  if (!t.startedAt) return { state: 'not_started', budgetMins, elapsedMins: 0, remainingMins: budgetMins };
  const start = new Date(t.startedAt);
  const end = t.doneAt ? new Date(t.doneAt) : now;
  const elapsedMins = businessMinutesBetween(start, end);
  const remainingMins = budgetMins - elapsedMins;
  return { state: remainingMins < 0 ? 'over' : 'within', budgetMins, elapsedMins, remainingMins };
}

// formatDuration: a minute count as business time, e.g. "2d 1h", "3h", "45m". Minutes show only under
// an hour-ish (when there are no days), to keep the badge short.
export function formatDuration(i18n: I18n, mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const d = Math.floor(m / 60 / WORK_HOURS_PER_DAY);
  const h = Math.floor((m / 60) % WORK_HOURS_PER_DAY);
  const mm = m % 60;
  const parts: string[] = [];
  if (d) parts.push(i18n._(msg`${d}d`));
  if (h) parts.push(i18n._(msg`${h}h`));
  if (mm && !d) parts.push(i18n._(msg`${mm}m`));
  return parts.join(' ') || i18n._(msg`0m`);
}
