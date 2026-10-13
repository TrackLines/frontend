import { describe, expect, test } from 'bun:test';
import type { RoadmapItem } from '@/lib/api';
import { buildGanttItems, DAY_MS, dayStamp, diamondFill, getGanttRange, milestoneDone, milestoneState, monthSegments, type GanttItem } from './gantt';

const item = (id: string, target_date: string | null, start_date: string | null = null, position = 0): RoadmapItem => ({
  id, title: id, description: '', target_date, start_date, position,
});

describe('roadmap Gantt data', () => {
  test('uses a target-only item as a milestone and keeps undated items below the chart', () => {
    const result = buildGanttItems([
      item('later', null, null, 2),
      item('range', '2026-03-12', '2026-03-01', 1),
      item('milestone', '2026-02-28', null, 0),
      item('start-only', null, '2026-01-01', 3),
    ]);

    expect(result.dated.map((entry) => entry.id)).toEqual(['milestone', 'range']);
    expect(result.dated[0].milestone).toBe(true);
    expect(result.dated[0].start).toBe(dayStamp('2026-02-28'));
    expect(result.dated[1].milestone).toBe(false);
    expect(result.undated.map((entry) => entry.id)).toEqual(['later', 'start-only']);
  });

  test('includes today and pads the visible date range', () => {
    const { dated } = buildGanttItems([item('milestone', '2026-04-01')]);
    const today = dayStamp('2026-03-15');
    const range = getGanttRange(dated, today);

    expect(range.start).toBeLessThan(today);
    expect(range.start + range.days * DAY_MS).toBeGreaterThan(dayStamp('2026-04-01'));
  });

  test('splits the chart axis at UTC month boundaries', () => {
    const start = dayStamp('2026-01-25');
    const segments = monthSegments(start, 20);

    expect(segments.map(({ label }) => label)).toEqual(['Jan 2026', 'Feb 2026']);
    expect(segments.reduce((sum, segment) => sum + segment.width, 0)).toBe(20);
    expect(segments[1].left).toBe(7);
  });
});

test('milestones: done shows checked, past due and not done is overdue, else upcoming', () => {
  const today = dayStamp('2026-10-13');
  const m = (over: Partial<GanttItem>) => ({ id: 'm', title: 'Launch', start: dayStamp('2026-10-31'), end: dayStamp('2026-10-31'), milestone: true, ...over }) as GanttItem;
  expect(milestoneState(m({}), today)).toBe('upcoming');
  expect(milestoneState(m({ end: dayStamp('2026-10-01') }), today)).toBe('overdue');
  expect(milestoneState(m({ end: dayStamp('2026-10-01'), manual_status: 'done' }), today)).toBe('done');
  expect(milestoneState(m({ progress: { done: 3, total: 3 } }), today)).toBe('done');
  expect(milestoneState(m({ progress: { done: 2, total: 3 }, manual_status: 'done' }), today)).toBe('upcoming'); // tickets decide when linked
  expect(milestoneState(m({ end: today }), today)).toBe('upcoming'); // due today isn't late yet
});

test('a diamond fills by area: a quarter done looks a quarter full', () => {
  const area = (h: number, size: number) => { // filled area of a diamond of height `size`, up to height h
    const half = size / 2;
    return h <= half ? h * h : size * size / 2 - (size - h) * (size - h);
  };
  for (const f of [0, 0.1, 0.25, 0.5, 0.75, 16 / 17, 1]) {
    expect(area(diamondFill(f, 24), 24) / (24 * 24 / 2)).toBeCloseTo(f, 5);
  }
  expect(diamondFill(0.25, 24)).toBeGreaterThan(24 / 4); // by height it would be far emptier
  expect(milestoneDone({ id: 'm', title: 't', description: '', target_date: null, position: 0, progress: { done: 1, total: 4 } })).toBe(0.25);
  expect(milestoneDone({ id: 'm', title: 't', description: '', target_date: null, position: 0, manual_status: 'done' })).toBe(1);
});
