// localDay: midnight of d's date in the user's zone, as a day count (DST-safe).
const localDay = (d: Date) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);

// sprintStatus describes how long is left on a sprint by local calendar days, the same days the scope
// lock uses: ends today on its last day, tomorrow the day before. The board page and the project's
// board cards both say this, so they can't disagree.
export function sprintStatus(endsAt: string, now: Date = new Date()): { label: string; overdue: boolean } {
  const ends = new Date(endsAt);
  const days = localDay(ends) - localDay(now);
  if (ends.getTime() < now.getTime()) {
    const late = -days;
    return { overdue: true, label: late <= 0 ? 'overdue — closes automatically' : `overdue by ${late} day${late === 1 ? '' : 's'}` };
  }
  if (days === 0) return { overdue: false, label: 'ends today' };
  if (days === 1) return { overdue: false, label: 'ends tomorrow' };
  return { overdue: false, label: `ends in ${days} days` };
}

// sprintLocked: on its last day (local calendar date, or once it's past its end) a sprint's scope is
// locked: nothing new can join it. Same rule as the backend, which reads our Tracklines-Timezone header.
export function sprintLocked(endsAt: string, now: Date = new Date()): boolean {
  const ends = new Date(endsAt);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return day(now) >= day(ends);
}

export const LENGTH_PRESETS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
] as const;
