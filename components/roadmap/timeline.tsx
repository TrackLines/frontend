'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RoadmapItem } from '@/lib/api';
import { groupByMonth } from './group';
import { buildGanttItems, DAY_MS, dayStamp, getGanttRange, monthSegments } from './gantt';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const statusLabel: Record<NonNullable<RoadmapItem['status']>, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

const chartDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const LABEL_WIDTH = 192;
const COLUMN_GAP = 12;

function Gantt({ items }: { items: RoadmapItem[] }) {
  const today = useMemo(() => dayStamp(new Date().toISOString().slice(0, 10)), []);
  const { dated: ordered, undated } = buildGanttItems(items);

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold">Gantt chart</h2>
        <p className="mt-2 text-sm text-muted-foreground">Add target dates to roadmap items to see them on the Gantt chart.</p>
        {undated.length > 0 && (
          <ul aria-label="Items without target dates" className="mt-5 divide-y">
            {undated.map((item) => <li key={item.id} className="py-3 font-medium">{item.title}</li>)}
          </ul>
        )}
      </div>
    );
  }

  const range = getGanttRange(ordered, today);
  const width = Math.max(760, range.days * 28);
  const pxPerDay = width / range.days;
  const todayLeft = LABEL_WIDTH + COLUMN_GAP + ((today - range.start) / DAY_MS) * pxPerDay;
  const months = monthSegments(range.start, range.days);

  return (
    <div className="grid gap-6">
      <section aria-label="Gantt chart" className="rounded-xl border p-4">
        <h2 className="mb-4 font-semibold">Gantt chart</h2>
        <div className="overflow-x-auto pb-2">
          <div className="relative" style={{ width: LABEL_WIDTH + COLUMN_GAP + width }}>
            <div className="mb-3 grid items-end gap-3 text-xs text-muted-foreground" style={{ gridTemplateColumns: `${LABEL_WIDTH}px ${width}px` }} aria-hidden="true">
              <div />
              <div className="flex border-b">
                {months.map((month, index) => (
                  <div key={`${month.label}-${index}`} className="shrink-0 truncate border-l px-2 pb-2 font-medium" style={{ width: month.width * pxPerDay }}>
                    {month.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-primary/70" style={{ left: todayLeft }} aria-label="Today" title="Today" />
              <ol className="divide-y">
                {ordered.map((item) => {
                  const offset = ((item.start - range.start) / DAY_MS) * pxPerDay;
                  const spanDays = Math.max(1, (item.end - item.start) / DAY_MS + 1);
                  const barWidth = spanDays * pxPerDay;
                  const linked = item.progress && item.progress.total > 0;
                  const fill = linked
                    ? (item.progress!.done / item.progress!.total) * 100
                    : item.status === 'done' || item.manual_status === 'done' ? 100 : 0;
                  const startLabel = chartDay.format(new Date(item.start));
                  const endLabel = chartDay.format(new Date(item.end));
                  return (
                    <li key={item.id} className="grid min-h-16 items-center gap-3 py-2" style={{ gridTemplateColumns: `${LABEL_WIDTH}px ${width}px` }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={item.title}>{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.milestone ? `Due ${endLabel}` : `${startLabel} – ${endLabel}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {linked ? `${item.progress!.done} of ${item.progress!.total} tickets done` : statusLabel[item.status ?? item.manual_status ?? 'not_started']}
                        </p>
                      </div>
                      <div className="relative h-10">
                        {item.milestone ? (
                          <span
                            role="img"
                            className="absolute top-2.5 z-[1] size-5 rotate-45 border-2 border-primary bg-background"
                            style={{ left: offset + Math.max(0, (barWidth - 20) / 2) }}
                            aria-label={`${item.title}: milestone due ${endLabel}`}
                            title={`${item.title}: due ${endLabel}`}
                          />
                        ) : (
                          <div
                            role="img"
                            className="absolute top-2 h-6 overflow-hidden rounded-md border border-primary/70 bg-primary/15"
                            style={{ left: offset, width: barWidth }}
                            aria-label={`${item.title}: ${startLabel} to ${endLabel}`}
                            title={`${item.title}: ${startLabel} to ${endLabel}`}
                          >
                            <div className="h-full bg-primary/40" style={{ width: `${Math.min(100, Math.max(0, fill))}%` }} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-4 border-l-2 border-primary/70" aria-hidden="true" /> Today</p>
      </section>
      {undated.length > 0 && (
        <section aria-label="Undated roadmap items" className="rounded-xl border p-4">
          <h2 className="font-semibold">No target date</h2>
          <ol className="mt-2 divide-y">
            {undated.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium">{item.title}</span>
                {item.start_date && <span className="text-sm text-muted-foreground">Starts {day.format(new Date(`${item.start_date}T00:00:00Z`))}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function Timeline({ id, items, progress }: { id: string; items: RoadmapItem[]; progress?: { done: number; total: number } }) {
  const [view, setView] = useState<'timeline' | 'gantt'>('timeline');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`roadmap-view:${id}`);
      if (saved === 'timeline' || saved === 'gantt') setView(saved);
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [id]);
  function chooseView(next: 'timeline' | 'gantt') {
    setView(next);
    try { window.localStorage.setItem(`roadmap-view:${id}`, next); } catch { /* The view still works without storage. */ }
  }
  const groups = groupByMonth(items);
  return (
    <div className="grid gap-8">
      <section aria-label="Roadmap progress" className="rounded-xl border p-4">
        {progress && progress.total > 0 ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <h2 className="font-semibold">Overall progress</h2>
              <span>{progress.done} of {progress.total} tickets done ({Math.round((progress.done / progress.total) * 100)}%)</span>
            </div>
            <div
              role="progressbar"
              aria-label="Roadmap ticket progress"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No linked tickets yet; roadmap item statuses are manual.</p>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Roadmap schedule</h2>
        <div role="group" aria-label="Roadmap view" className="inline-flex rounded-lg border p-1">
          <Button type="button" size="sm" variant={view === 'timeline' ? 'secondary' : 'ghost'} aria-pressed={view === 'timeline'} onClick={() => chooseView('timeline')}>Timeline</Button>
          <Button type="button" size="sm" variant={view === 'gantt' ? 'secondary' : 'ghost'} aria-pressed={view === 'gantt'} onClick={() => chooseView('gantt')}>Gantt</Button>
        </div>
      </div>
      {view === 'gantt' ? <Gantt items={items} /> : !groups.length ? <p className="text-muted-foreground">Nothing on this roadmap yet.</p> : (
        <ol className="space-y-10">
          {groups.map((g) => (
            <li key={g.label}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h2>
              <ol className="space-y-4 border-l pl-6">
                {g.items.map((i) => (
                  <li key={i.id} className="relative">
                    <span className="absolute -left-[1.85rem] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-medium">{i.title}</h3>
                      <Badge variant={i.status === 'done' ? 'default' : 'secondary'}>{statusLabel[i.status ?? i.manual_status ?? 'not_started']}</Badge>
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
      )}
    </div>
  );
}
