const DAY = 24 * 60 * 60 * 1000;

// sprintStatus describes how long is left on a sprint, by whole calendar days remaining.
export function sprintStatus(endsAt: string, now: Date = new Date()): { label: string; overdue: boolean } {
  const ms = new Date(endsAt).getTime() - now.getTime();
  if (ms < 0) {
    const days = Math.floor(-ms / DAY);
    return { overdue: true, label: days === 0 ? 'overdue — closes automatically' : `overdue by ${days} day${days === 1 ? '' : 's'}` };
  }
  const days = Math.ceil(ms / DAY);
  if (ms < DAY && new Date(endsAt).toDateString() === now.toDateString()) return { overdue: false, label: 'ends today' };
  return { overdue: false, label: `ends in ${days} day${days === 1 ? '' : 's'}` };
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
