import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';

// localDay: midnight of d's date in the user's zone, as a day count (DST-safe).
const localDay = (d: Date) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);

// sprintStatus describes how long is left on a sprint by local calendar days, the same days the scope
// lock uses: ends today on its last day, tomorrow the day before. The board page and the project's
// board cards both say this, so they can't disagree.
export function sprintStatus(endsAt: string, i18n: I18n, now: Date = new Date()): { label: string; overdue: boolean } {
  const ends = new Date(endsAt);
  const days = localDay(ends) - localDay(now);
  if (ends.getTime() < now.getTime()) {
    const late = -days;
    return { overdue: true, label: late <= 0 ? i18n._(msg`overdue — closes automatically`) : i18n._(msg`overdue by ${plural(late, { one: '# day', other: '# days' })}`) };
  }
  if (days === 0) return { overdue: false, label: i18n._(msg`ends today`) };
  if (days === 1) return { overdue: false, label: i18n._(msg`ends tomorrow`) };
  return { overdue: false, label: i18n._(msg`ends in ${days} days`) };
}

// sprintLocked: on its last day (local calendar date, or once it's past its end) a sprint's scope is
// locked: nothing new can join it. Same rule as the backend, which reads our Tracklines-Timezone header.
export function sprintLocked(endsAt: string, now: Date = new Date()): boolean {
  const ends = new Date(endsAt);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return day(now) >= day(ends);
}

export const LENGTH_PRESETS = [
  { days: 7, label: msg`1 week` },
  { days: 14, label: msg`2 weeks` },
] as const;

// dateInput: a date as <input type="date"> wants it (YYYY-MM-DD), in the user's zone.
export const dateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// daysUntil: whole local calendar days from today to an end date (YYYY-MM-DD): the sprint length that
// ends on that date. NaN for anything that isn't a date.
export function daysUntil(end: string, now: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end);
  if (!m) return NaN;
  return localDay(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) - localDay(now);
}
