import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { RoadmapItem } from '@/lib/api';
import { dates } from '@/lib/i18n';

export type Group = { label: string; items: RoadmapItem[] };

// groupByMonth buckets items by target month (oldest first); undated items go last under "Later".
export function groupByMonth(i18n: I18n, items: RoadmapItem[]): Group[] {
  const dated = items.filter((i) => i.target_date).sort((a, b) =>
    a.target_date!.localeCompare(b.target_date!) || a.position - b.position);
  const groups: Group[] = [];
  for (const item of dated) {
    // target_date is YYYY-MM-DD; parse as UTC so the month never shifts with the viewer's timezone
    const label = dates(i18n, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.target_date}T00:00:00Z`));
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1)!.items.push(item);
  }
  const undated = items.filter((i) => !i.target_date).sort((a, b) => a.position - b.position);
  if (undated.length) groups.push({ label: i18n._(msg`Later`), items: undated });
  return groups;
}
