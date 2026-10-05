import type { RoadmapItem } from '@/lib/api';
import { groupByMonth } from './group';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function Timeline({ items }: { items: RoadmapItem[] }) {
  const groups = groupByMonth(items);
  if (!groups.length) return <p className="text-muted-foreground">Nothing on this roadmap yet.</p>;
  return (
    <ol className="space-y-10">
      {groups.map((g) => (
        <li key={g.label}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h2>
          <ol className="space-y-4 border-l pl-6">
            {g.items.map((i) => (
              <li key={i.id} className="relative">
                <span className="absolute -left-[1.85rem] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="font-medium">{i.title}</h3>
                  {i.target_date && (
                    <time dateTime={i.target_date} className="text-sm text-muted-foreground">
                      {day.format(new Date(`${i.target_date}T00:00:00Z`))}
                    </time>
                  )}
                </div>
                {i.description && <p className="mt-1 whitespace-pre-line text-muted-foreground">{i.description}</p>}
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
