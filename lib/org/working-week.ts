import type { WorkWeek, WorkWeeks } from '@/lib/api';

// DEFAULT_WEEK: the week until one is set (TL-510): Monday to Friday, Monday first, 09:00–17:00.
export const DEFAULT_WEEK: WorkWeek = { days: [1, 2, 3, 4, 5], week_start: 1, start_minute: 9 * 60, end_minute: 17 * 60 };

// weekFor: a project's working week: its own, else the organization's, else the default.
export const weekFor = (weeks: WorkWeeks | null | undefined, project?: string | null): WorkWeek =>
  (project && weeks?.projects[project]) || weeks?.org || DEFAULT_WEEK;

// validWeek: what the backend takes: at least one working day, hours of at least an hour within the day.
export const validWeek = (w: WorkWeek) =>
  w.days.length > 0 && new Set(w.days).size === w.days.length && w.days.every((d) => d >= 0 && d <= 6) &&
  w.week_start >= 0 && w.week_start <= 6 && w.start_minute >= 0 && w.end_minute <= 24 * 60 && w.end_minute - w.start_minute >= 60;

// hhmm and minutes convert between "09:00" (a time input) and minutes from midnight.
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const minutes = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};
