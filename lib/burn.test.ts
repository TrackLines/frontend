import { expect, test } from 'bun:test';
import { average, burnSteps } from './burn';

const burn = { number: 2, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-15T00:00:00Z', total: 10, unestimated: 0, done: [
  { at: '2026-10-03T00:00:00Z', value: 3 },
  { at: '2026-09-20T00:00:00Z', value: 2 }, // before the sprint: clamped to its start
] };

test('burn steps accumulate and stop at now', () => {
  const now = Date.parse('2026-10-05T00:00:00Z');
  const steps = burnSteps(burn, now);
  expect(steps.map((s) => s.done)).toEqual([0, 2, 5, 5]); // sorted by time
  expect(steps[1].at).toBe(Date.parse('2026-10-01T00:00:00Z'));
  expect(steps.at(-1)?.at).toBe(now);
});

test('burn steps stop at the sprint end once it has passed', () => {
  expect(burnSteps(burn, Date.parse('2026-11-01T00:00:00Z')).at(-1)?.at).toBe(Date.parse('2026-10-15T00:00:00Z'));
});

test('average needs three closed sprints, then uses the last three', () => {
  const s = (completed: number) => ({ number: 1, starts_at: '', closed_at: '', completed });
  expect(average({ unit: 'points', sprints: [s(5), s(8)], current: null })).toBeNull();
  expect(average({ unit: 'points', sprints: [s(100), s(3), s(6), s(9)], current: null })).toBe(6);
});
