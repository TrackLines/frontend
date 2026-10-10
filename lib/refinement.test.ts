import { expect, test } from 'bun:test';
import type { Capacity } from './api';
import { capacityView } from './refinement';

const cap = (c: Partial<Capacity>): Capacity => ({
  unit: 'points', velocity: 8, cap: 8.8, used: 0, unestimated: 0, over: false,
  approved_total: null, approved_by: null, approved_at: null, needs_approval: false, ...c,
});

test('no velocity yet: no limit, no bar', () => {
  const v = capacityView(cap({ velocity: null, cap: null, used: 5, unestimated: 2 }));
  expect(v).toEqual({ label: '5 points · no velocity yet · 2 unestimated', percent: null, state: 'unknown', note: 'No closed sprints yet, so there’s no limit.' });
});

test('within capacity', () => {
  expect(capacityView(cap({ used: 4.4 }))).toEqual({ label: '4.4 / 8.8 points', percent: 50, state: 'ok', note: null });
  expect(capacityView(cap({ unit: 'tickets', cap: 5, used: 5 })).label).toBe('5 / 5 tickets');
});

test('over: needs approval, until approved', () => {
  const over = capacityView(cap({ used: 10, over: true, needs_approval: true }));
  expect(over.state).toBe('over');
  expect(over.percent).toBe(100);
  expect(over.note).toBe('1.2 over: needs approval to start, or move tickets out');
  expect(capacityView(cap({ used: 10, over: true, approved_total: 10 })).state).toBe('approved');
});
