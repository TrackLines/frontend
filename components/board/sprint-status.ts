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

export const LENGTH_PRESETS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
] as const;
