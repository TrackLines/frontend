import { describe, expect, test } from 'bun:test';
import type { RoadmapItem } from '@/lib/api';
import { buildGanttItems, DAY_MS, dayStamp, getGanttRange, monthSegments } from './gantt';

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
