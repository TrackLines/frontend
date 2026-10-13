import type { RoadmapItem } from '@/lib/api';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const dayStamp = (date: string) => Date.parse(`${date}T00:00:00Z`);

export type GanttItem = RoadmapItem & { start: number; end: number; milestone: boolean };

export function buildGanttItems(items: RoadmapItem[]): { dated: GanttItem[]; undated: RoadmapItem[] } {
  const dated = items.flatMap((item) => {
    if (!item.target_date) return [];
    const target = dayStamp(item.target_date);
    const start = item.start_date ? dayStamp(item.start_date) : target;
    return [{ ...item, start, end: target, milestone: !item.start_date }];
  }).sort((a, b) => a.position - b.position);
  const undated = items.filter((item) => !item.target_date).sort((a, b) => a.position - b.position);
  return { dated, undated };
}

export function getGanttRange(items: GanttItem[], today: number) {
  const values = items.flatMap((item) => [item.start, item.end]).concat(today);
  const first = Math.min(...values);
  const last = Math.max(...values);
  const padding = Math.max(7, Math.ceil((last - first) / DAY_MS * 0.04));
  const start = first - padding * DAY_MS;
  const end = last + padding * DAY_MS;
  return { start, days: Math.max(1, Math.ceil((end - start) / DAY_MS)) };
}

export function monthSegments(start: number, days: number) {
  const segments: { label: string; left: number; width: number }[] = [];
  const end = start + days * DAY_MS;
  let cursor = start;
  const formatter = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  while (cursor < end) {
    const date = new Date(cursor);
    const monthEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    const segmentEnd = Math.min(end, monthEnd);
    const offset = (cursor - start) / DAY_MS;
    const length = (segmentEnd - cursor) / DAY_MS;
    segments.push({ label: formatter.format(date), left: offset, width: length });
    cursor = segmentEnd;
  }
  return segments;
}

// itemDone: a roadmap item is done when all its linked tickets are, or (no tickets) it's marked done.
export function itemDone(item: RoadmapItem): boolean {
  if (item.progress && item.progress.total > 0) return item.progress.done === item.progress.total;
  return item.status === 'done' || item.manual_status === 'done';
}

// milestoneState: how a milestone's diamond shows: done (filled, checked), overdue (due before today
// and not done), or upcoming.
export function milestoneState(item: GanttItem, today: number): 'done' | 'overdue' | 'upcoming' {
  if (itemDone(item)) return 'done';
  return item.end < today ? 'overdue' : 'upcoming';
}

// milestoneDone: how much of a milestone is done, 0–1: its linked tickets, else all or nothing.
export function milestoneDone(item: RoadmapItem): number {
  if (item.progress && item.progress.total > 0) return item.progress.done / item.progress.total;
  return itemDone(item) ? 1 : 0;
}

// diamondFill: how high (from the bottom point) to fill a diamond of the given height so the filled
// AREA is `done` of it: 1/4 done looks a quarter full, though the diamond is narrow at the bottom.
// Below the middle the filled part is a triangle (area grows with height²); above it, the empty
// part at the top is.
export function diamondFill(done: number, size: number): number {
  const f = Math.min(1, Math.max(0, done));
  const half = size / 2;
  return f <= 0.5 ? half * Math.sqrt(2 * f) : size - half * Math.sqrt(2 * (1 - f));
}
