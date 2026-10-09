import type { Burn, Velocity } from './api';

export const MIN_SPRINTS_FOR_VELOCITY = 3;

export type BurnStep = { at: number; done: number }; // ms, cumulative value done

// burnSteps is the open sprint's cumulative "done" as a step line: 0 at the start, one step
// per finished ticket, then flat until now (or the sprint's end, if that's sooner).
export function burnSteps(burn: Burn, now = Date.now()): BurnStep[] {
  const start = Date.parse(burn.starts_at);
  const end = Math.max(start, Math.min(now, Date.parse(burn.ends_at)));
  const steps: BurnStep[] = [{ at: start, done: 0 }];
  let done = 0;
  const times = burn.done.map((d) => ({ at: Math.min(Math.max(Date.parse(d.at), start), end), value: d.value })).sort((a, b) => a.at - b.at);
  for (const d of times) {
    done += d.value;
    steps.push({ at: d.at, done });
  }
  steps.push({ at: end, done });
  return steps;
}

// average is the mean of the last `last` closed sprints, or null until there are enough of them.
export function average(v: Velocity, last = MIN_SPRINTS_FOR_VELOCITY): number | null {
  if (v.sprints.length < MIN_SPRINTS_FOR_VELOCITY) return null;
  const recent = v.sprints.slice(-last);
  return recent.reduce((n, s) => n + s.completed, 0) / recent.length;
}
