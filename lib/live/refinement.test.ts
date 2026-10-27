import { expect, test } from 'bun:test';
import type { Capacity } from '../api';
import { i18nFor } from '../i18n';
import { capacityView } from './refinement';

const en = i18nFor('en');

const cap = (c: Partial<Capacity>): Capacity => ({
  unit: 'points', velocity: 8, cap: 8.8, used: 0, unestimated: 0, over: false,
  approved_total: null, approved_by: null, approved_at: null, needs_approval: false, ...c,
});

test('no velocity yet: no limit, no bar', () => {
  const v = capacityView(cap({ velocity: null, cap: null, used: 5, unestimated: 2 }), en);
  expect(v).toEqual({ label: '5 points · no velocity yet · 2 unestimated', percent: null, state: 'unknown', note: 'No closed sprints yet, so there’s no limit.', availability: null });
});

test('within capacity', () => {
  expect(capacityView(cap({ used: 4.4 }), en)).toEqual({ label: '4.4 / 8.8 points', percent: 50, state: 'ok', note: null, availability: null });
  expect(capacityView(cap({ unit: 'tickets', cap: 5, used: 5 }), en).label).toBe('5 / 5 tickets');
});

test('over: needs approval, until approved', () => {
  const over = capacityView(cap({ used: 10, over: true, needs_approval: true }), en);
  expect(over.state).toBe('over');
  expect(over.percent).toBe(100);
  expect(over.note).toBe('1.2 over: needs approval to start, or move tickets out');
  expect(capacityView(cap({ used: 10, over: true, approved_total: 10 }), en).state).toBe('approved');
});

test('team availability shows beside the (already scaled) cap (TL-408)', () => {
  expect(capacityView(cap({ availability: { percent: 85, person_days_away: 6 } }), en).availability).toBe('85% available · 6 person-days away');
  expect(capacityView(cap({ availability: { percent: 95, person_days_away: 1 } }), en).availability).toBe('95% available · 1 person-day away');
  expect(capacityView(cap({ availability: null }), en).availability).toBeNull();
});
