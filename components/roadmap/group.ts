import type { RoadmapItem } from '@/lib/api';

export type Group = { label: string; items: RoadmapItem[] };

const month = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// groupByMonth buckets items by target month (oldest first); undated items go last under "Later".
export function groupByMonth(items: RoadmapItem[]): Group[] {
  const dated = items.filter((i) => i.target_date).sort((a, b) =>
    a.target_date!.localeCompare(b.target_date!) || a.position - b.position);
  const groups: Group[] = [];
  for (const item of dated) {
    // target_date is YYYY-MM-DD; parse as UTC so the month never shifts with the viewer's timezone
    const label = month.format(new Date(`${item.target_date}T00:00:00Z`));
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1)!.items.push(item);
  }
  const undated = items.filter((i) => !i.target_date).sort((a, b) => a.position - b.position);
  if (undated.length) groups.push({ label: 'Later', items: undated });
  return groups;
}
