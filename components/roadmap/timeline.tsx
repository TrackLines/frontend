'use client';

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useId, useMemo, useState } from 'react';
import type { RoadmapItem } from '@/lib/api';
import { groupByMonth } from './group';
import { buildGanttItems, DAY_MS, dayStamp, diamondFill, getGanttRange, milestoneDone, milestoneState, monthSegments } from './gantt';
import { cn } from '@/lib/utils';
import { dates } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pager } from '@/components/pager';

const statusLabel: Record<NonNullable<RoadmapItem['status']>, MessageDescriptor> = {
  not_started: msg`Not started`,
  in_progress: msg`In progress`,
  done: msg`Done`,
};

const LABEL_WIDTH = 192;
const COLUMN_GAP = 12;
const PAGE_SIZE = 20;

export function Gantt({ items }: { items: RoadmapItem[] }) {
  const { t, i18n } = useLingui();
  const today = useMemo(() => dayStamp(new Date().toISOString().slice(0, 10)), []);
  const { dated: ordered, undated } = buildGanttItems(items);

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold"><Trans>Gantt chart</Trans></h2>
        <p className="mt-2 text-sm text-muted-foreground"><Trans>Add target dates to roadmap items to see them on the Gantt chart.</Trans></p>
        {undated.length > 0 && (
          <ul aria-label={t`Items without target dates`} className="mt-5 divide-y">
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
  const months = monthSegments(i18n, range.start, range.days);

  return (
    <div className="grid min-w-0 max-w-full gap-6">
      <section aria-label={t`Gantt chart`} className="min-w-0 max-w-full rounded-xl border p-4">
        <h2 className="mb-4 font-semibold"><Trans>Gantt chart</Trans></h2>
        <div className="w-full min-w-0 max-w-full overflow-x-auto pb-2">
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
              <div className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-primary/70" style={{ left: todayLeft }} aria-label={t`Today`} title={t`Today`} />
              <ol className="divide-y">
                {ordered.map((item) => {
                  const offset = ((item.start - range.start) / DAY_MS) * pxPerDay;
                  const spanDays = Math.max(1, (item.end - item.start) / DAY_MS + 1);
                  const barWidth = spanDays * pxPerDay;
                  const linked = item.progress && item.progress.total > 0;
                  const fill = linked
                    ? (item.progress!.done / item.progress!.total) * 100
                    : item.status === 'done' || item.manual_status === 'done' ? 100 : 0;
                  const startLabel = dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(item.start));
                  const endLabel = dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(item.end));
                  const done = item.progress?.done ?? 0, total = item.progress?.total ?? 0;
                  return (
                    <li key={item.id} className="grid min-h-16 items-center gap-3 py-2" style={{ gridTemplateColumns: `${LABEL_WIDTH}px ${width}px` }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={item.title}>{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.milestone ? t`Due ${endLabel}` : `${startLabel} – ${endLabel}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {linked ? <Trans>{done} of <Plural value={total} one="# ticket" other="# tickets" /> done</Trans> : i18n._(statusLabel[item.status ?? item.manual_status ?? 'not_started'])}
                        </p>
                      </div>
                      <div className="relative h-10">
                        {item.milestone ? (
                          <Milestone state={milestoneState(item, today)} done={milestoneDone(item)} left={offset + Math.max(0, (barWidth - 20) / 2)} title={item.title} due={endLabel} />
                        ) : (
                          <div
                            role="img"
                            className="absolute top-2 h-6 overflow-hidden rounded-md border border-primary/70 bg-primary/15"
                            style={{ left: offset, width: barWidth }}
                            aria-label={t`${item.title}: ${startLabel} to ${endLabel}`}
                            title={t`${item.title}: ${startLabel} to ${endLabel}`}
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
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-4 border-l-2 border-primary/70" aria-hidden="true" /> <Trans>Today</Trans></span>
          <span className="flex items-center gap-2"><span className="size-2.5 rotate-45 border-2 border-primary" aria-hidden="true" /> <Trans>Milestone, on its due date</Trans></span>
          <span className="flex items-center gap-2"><span className="size-2.5 rotate-45 border-2 border-primary bg-gradient-to-tl from-primary from-50% to-transparent to-50%" aria-hidden="true" /> <Trans>Filled as its tickets get done</Trans></span>
          <span className="flex items-center gap-2"><span className="size-2.5 rotate-45 border-2 border-destructive" aria-hidden="true" /> <Trans>Overdue</Trans></span>
        </p>
      </section>
      {undated.length > 0 && (
        <section aria-label={t`Undated roadmap items`} className="rounded-xl border p-4">
          <h2 className="font-semibold"><Trans>No target date</Trans></h2>
          <ol className="mt-2 divide-y">
            {undated.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium">{item.title}</span>
                {item.start_date && <span className="text-sm text-muted-foreground">{t`Starts ${dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${item.start_date}T00:00:00Z`))}`}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function Timeline({ id, items, progress }: { id: string; items: RoadmapItem[]; progress?: { done: number; total: number } }) {
  const { t, i18n } = useLingui();
  const [view, setView] = useState<'timeline' | 'gantt'>('timeline');
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
    try {
      const saved = window.localStorage.getItem(`roadmap-view:${id}`);
      if (saved === 'timeline' || saved === 'gantt') setView(saved);
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [id]);
  function chooseView(next: 'timeline' | 'gantt') {
    setView(next);
    setPage(1);
    try { window.localStorage.setItem(`roadmap-view:${id}`, next); } catch { /* The view still works without storage. */ }
  }
  const timelineItems = groupByMonth(i18n, items).flatMap((group) => group.items);
  const ganttItems = [...items].sort((a, b) => a.position - b.position);
  const orderedItems = view === 'gantt' ? ganttItems : timelineItems;
  const pageCount = Math.ceil(orderedItems.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const pageItems = orderedItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const groups = view === 'timeline' ? groupByMonth(i18n, pageItems) : [];
  const firstItem = orderedItems.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(currentPage * PAGE_SIZE, orderedItems.length);
  return (
    <div className="grid min-w-0 max-w-full gap-8">
      <section aria-label={t`Roadmap progress`} className="rounded-xl border p-4">
        {progress && progress.total > 0 ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <h2 className="font-semibold"><Trans>Overall progress</Trans></h2>
              <span><Trans>{progress.done} of <Plural value={progress.total} one="# ticket" other="# tickets" /> done ({Math.round((progress.done / progress.total) * 100)}%)</Trans></span>
            </div>
            <div
              role="progressbar"
              aria-label={t`Roadmap ticket progress`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground"><Trans>No linked tickets yet; roadmap item statuses are manual.</Trans></p>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="roadmap-schedule" className="text-lg font-semibold"><Trans>Roadmap schedule</Trans></h2>
        <div role="group" aria-label={t`Roadmap view`} className="inline-flex rounded-lg border p-1">
          <Button type="button" size="sm" variant={view === 'timeline' ? 'secondary' : 'ghost'} aria-pressed={view === 'timeline'} onClick={() => chooseView('timeline')}><Trans>Timeline</Trans></Button>
          <Button type="button" size="sm" variant={view === 'gantt' ? 'secondary' : 'ghost'} aria-pressed={view === 'gantt'} onClick={() => chooseView('gantt')}><Trans>Gantt</Trans></Button>
        </div>
      </div>
      {view === 'gantt' ? <Gantt items={pageItems} /> : !groups.length ? <p className="text-muted-foreground"><Trans>Nothing on this roadmap yet.</Trans></p> : (
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
                      <Badge variant={i.status === 'done' ? 'default' : 'secondary'}>{i18n._(statusLabel[i.status ?? i.manual_status ?? 'not_started'])}</Badge>
                      {i.target_date && (
                        <time dateTime={i.target_date} className="text-sm text-muted-foreground">
                          {dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${i.target_date}T00:00:00Z`))}
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
      {pageCount > 1 && (
        <div className="grid justify-items-center gap-2">
          <p aria-live="polite" className="text-sm text-muted-foreground"><Trans>Showing {firstItem}–{lastItem} of {orderedItems.length} items</Trans></p>
          <Pager page={currentPage} lastPage={pageCount} onPage={setPage} anchor="#roadmap-schedule" className="" />
        </div>
      )}
    </div>
  );
}

// Milestone: a diamond on the due date, filled from the bottom by how much is done (by area); checked
// once done, red outline when overdue.
export function Milestone({ state, done, left, title, due }: { state: 'done' | 'overdue' | 'upcoming'; done: number; left: number; title: string; due: string }) {
  const { t } = useLingui();
  const pct = Math.round(Math.min(1, Math.max(0, done)) * 100);
  const said = state === 'done' ? t`done`
    : state === 'overdue' ? (pct > 0 ? t`${pct}% done, overdue, was due ${due}` : t`overdue, was due ${due}`)
    : pct > 0 ? t`${pct}% done, due ${due}` : t`due ${due}`;
  const S = 24; // the diamond's box, in px and SVG units
  const fill = diamondFill(state === 'done' ? 1 : done, S);
  const clip = `milestone-${useId().replace(/:/g, '')}`; // unique per diamond, even with the same title
  return (
    <svg
      role="img"
      data-state={state}
      viewBox={`0 0 ${S} ${S}`}
      width={S}
      height={S}
      className="absolute top-2 z-[1]"
      style={{ left: left - 2 }}
      aria-label={t`${title}: milestone ${said}`}
    >
      <title>{`${title}: ${said}`}</title>
      <clipPath id={clip}><polygon points={`${S / 2},1 ${S - 1},${S / 2} ${S / 2},${S - 1} 1,${S / 2}`} /></clipPath>
      <polygon points={`${S / 2},1 ${S - 1},${S / 2} ${S / 2},${S - 1} 1,${S / 2}`} className="fill-background" />
      {fill > 0 && <rect data-fill={fill.toFixed(1)} x="0" y={S - fill} width={S} height={fill} clipPath={`url(#${clip})`} className="fill-primary" />}
      <polygon points={`${S / 2},1 ${S - 1},${S / 2} ${S / 2},${S - 1} 1,${S / 2}`} fill="none" strokeWidth="2"
        className={cn(state === 'overdue' ? 'stroke-destructive' : 'stroke-primary')} />
      {state === 'done' && <path d="M7.5 12.5l3 3 6-6.5" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />}
    </svg>
  );
}
