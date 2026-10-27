import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { WorkWeek } from '@/lib/api';
import { DEFAULT_WEEK } from '@/lib/org/working-week';

// Spike timebox tracking (TL-506): how much of a spike's timebox is used, in business hours of the
// project's working week (TL-510; Mon–Fri 09:00–17:00 unless set), in the viewer's local timezone. A
// "day" of timebox is one working day.

export const dayHours = (week: WorkWeek = DEFAULT_WEEK) => (week.end_minute - week.start_minute) / 60;

export type TimeboxState = 'not_started' | 'within' | 'over';
export type TimeboxStatus = { state: TimeboxState; budgetMins: number; elapsedMins: number; remainingMins: number };

// timeboxBudgetMins: a days+hours timebox as minutes of business time.
export function timeboxBudgetMins(days?: number | null, hours?: number | null, week: WorkWeek = DEFAULT_WEEK): number {
  return ((days ?? 0) * dayHours(week) + (hours ?? 0)) * 60;
}

// businessMinutesBetween: minutes of [start, end] that fall inside the working week (local time). Days off
// and nights don't count, so the clock is frozen outside work hours.
export function businessMinutesBetween(start: Date, end: Date, week: WorkWeek = DEFAULT_WEEK): number {
  if (!(end.getTime() > start.getTime())) return 0;
  let total = 0;
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; i < 4000 && day.getTime() <= end.getTime(); i++) {
    if (week.days.includes(day.getDay())) {
      const ws = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, week.start_minute).getTime();
      const we = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, week.end_minute).getTime();
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
  week: WorkWeek = DEFAULT_WEEK,
): TimeboxStatus {
  const budgetMins = timeboxBudgetMins(t.days, t.hours, week);
  if (!t.startedAt) return { state: 'not_started', budgetMins, elapsedMins: 0, remainingMins: budgetMins };
  const start = new Date(t.startedAt);
  const end = t.doneAt ? new Date(t.doneAt) : now;
  const elapsedMins = businessMinutesBetween(start, end, week);
  const remainingMins = budgetMins - elapsedMins;
  return { state: remainingMins < 0 ? 'over' : 'within', budgetMins, elapsedMins, remainingMins };
}

// formatDuration: a minute count as business time, e.g. "2d 1h", "3h", "45m". Minutes show only under
// an hour-ish (when there are no days), to keep the badge short.
export function formatDuration(i18n: I18n, mins: number, week: WorkWeek = DEFAULT_WEEK): string {
  const m = Math.max(0, Math.round(mins));
  const perDay = dayHours(week);
  const d = Math.floor(m / 60 / perDay);
  const h = Math.floor((m / 60) % perDay);
  const mm = m % 60;
  const parts: string[] = [];
  if (d) parts.push(i18n._(msg`${d}d`));
  if (h) parts.push(i18n._(msg`${h}h`));
  if (mm && !d) parts.push(i18n._(msg`${mm}m`));
  return parts.join(' ') || i18n._(msg`0m`);
}
