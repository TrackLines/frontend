import { expect, test } from 'bun:test';
import type { PlannedSprint, Velocity } from '../api';
import { i18nFor } from '../i18n';
import { daysLeft, fullness, moveTargets, overNote } from './move-to-board';

const en = i18nFor('en');
const now = new Date('2026-10-20T09:00:00Z');
const v = (over: Partial<Velocity> = {}): Velocity => ({
  unit: 'points', sprints: [], cap: 11, current: { number: 4, starts_at: '2026-10-13T09:00:00Z', ends_at: '2026-10-23T09:00:00Z', total: 8, unestimated: 0, done: [] }, ...over,
});
const plan = (used: number, approved: number | null = null): PlannedSprint => ({
  id: 'p5', board_id: 'b', position: 1, number: 5, length_days: 14, tickets: [],
  capacity: { unit: 'points', velocity: 10, cap: 11, used, unestimated: 0, over: used > 11, approved_total: approved, approved_by: null, approved_at: null, needs_approval: false },
});

test('the current sprint and planned ones, with how full each gets with this ticket (TL-464)', () => {
  const [current, next] = moveTargets(v(), [plan(5)], '3', en, now);
  expect(current).toMatchObject({ id: 'current', label: 'Sprint 4 (current, 3 days left)', used: 8, after: 11, cap: 11, over: false });
  expect(next).toMatchObject({ id: 'p5', label: 'Sprint 5 (planned)', after: 8, over: false });
  expect(overNote(current, en)).toBeNull(); // exactly at capacity fits
  expect(fullness(current, en)).toBe('8 / 11 points');
});

test('past capacity: the current sprint warns, a planned one says it will need approval', () => {
  const [current, next] = moveTargets(v(), [plan(10)], '5', en, now);
  expect(current.over).toBe(true);
  expect(overNote(current, en)).toBe('This takes the current sprint 2 points over capacity (13 / 11).');
  expect(next.needsApproval).toBe(true);
  expect(overNote(next, en)).toContain('it will need approval before it can start');
  // already approved for at least this much: over, but no new approval needed
  const [, approved] = moveTargets(v(), [plan(10, 20)], '5', en, now);
  expect(approved.needsApproval).toBe(false);
  expect(overNote(approved, en)).toContain('within what was approved');
});

test('no history means no limit; ticket boards count the ticket as 1; t-shirt sizes count as points', () => {
  const [free] = moveTargets(v({ cap: null }), [], '13', en, now);
  expect(free.over).toBe(false);
  expect(fullness(free, en)).toBe('8 points, no limit yet');
  const [tickets] = moveTargets(v({ unit: 'tickets', cap: 8.8 }), [], null, en, now);
  expect(tickets.after).toBe(9);
  expect(tickets.over).toBe(true);
  expect(moveTargets(v(), [], 'L', en, now)[0].after).toBe(13); // L = 5 points
  expect(moveTargets(v({ current: null }), [plan(1)], '1', en, now).map((t) => t.id)).toEqual(['p5']); // no open sprint
});

test('days left: whole days, the last day is 0', () => {
  expect(daysLeft('2026-10-23T09:00:00Z', now)).toBe(3);
  expect(daysLeft('2026-10-20T18:00:00Z', now)).toBe(1);
  expect(daysLeft('2026-10-19T18:00:00Z', now)).toBe(0);
  expect(moveTargets(v({ current: { ...v().current!, ends_at: '2026-10-20T08:00:00Z' } }), [], '1', en, now)[0].label).toBe('Sprint 4 (current, last day)');
});
