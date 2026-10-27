import { expect, test } from 'bun:test';
import { cycleTimePoints, flowChartState } from './flow';
import type { BoardFlow } from '../api';

const base: BoardFlow = {
  weeks: 2,
  tickets: [],
  median_cycle_days: null,
  p85_cycle_days: null,
  throughput: [{ week_start: '2026-10-05', tickets: 0 }, { week_start: '2026-10-12', tickets: 1 }],
};

test('flow charts show an empty state until tickets are completed', () => {
  expect(flowChartState(base)).toBe('empty');
});

test('flow charts retain throughput when completed tickets have no known start date', () => {
  const flow: BoardFlow = { ...base, tickets: [{ id: 't1', key: 'TL-1', title: 'Legacy ticket', started_at: null, done_at: '2026-10-12T10:00:00Z', cycle_days: null }] };
  expect(flowChartState(flow)).toBe('cycle-time-unavailable');
  expect(cycleTimePoints(flow)).toEqual([]);
});

test('flow charts plot known cycle times on completion date', () => {
  const flow: BoardFlow = { ...base, tickets: [{ id: 't1', key: 'TL-1', title: 'Ticket', started_at: '2026-10-10T10:00:00Z', done_at: '2026-10-12T10:00:00Z', cycle_days: 2 }] };
  expect(flowChartState(flow)).toBe('charts');
  expect(cycleTimePoints(flow)).toEqual([{ at: Date.parse('2026-10-12T10:00:00Z'), days: 2, key: 'TL-1', title: 'Ticket' }]);
});
