'use client';

import { plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from 'recharts';
import { boards, type BoardFlow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cycleTimePoints, flowChartState } from '@/lib/sprint/flow';
import { dates } from '@/lib/i18n';
import { Donut } from '@/components/reports/donut';
import { TYPE_LABEL } from '@/lib/sprint/sprint-report';

const fmtCount = (count: number) => String(count);

// FlowCharts reports continuous-flow board metrics; sprint boards use SprintBar's charts.
export function FlowCharts({ boardId, token }: { boardId: string; token: string }) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BoardFlow | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setFailed(false);
    boards.flow(boardId, token).then(setData, () => setFailed(true));
  }, [open, boardId]); // reload on open; token refreshes must not refetch

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Trans>Charts</Trans></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle><Trans>Kanban charts</Trans></DialogTitle>
            <DialogDescription><Trans>Cycle time and tickets completed per week over the last 12 weeks.</Trans></DialogDescription>
          </DialogHeader>
          {failed && <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load the charts. Please try again.</Trans></p>}
          {!data && !failed && <Skeleton role="status" aria-label={t`Loading charts…`} className="h-56 w-full" />}
          {data && flowChartState(data) === 'empty' && (
            <p role="status" className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"><Trans>No tickets have been completed in the last 12 weeks yet. Charts will appear when work is finished.</Trans></p>
          )}
          {data && flowChartState(data) !== 'empty' && (
            <div className="grid grid-cols-1 gap-8">
              <CycleTimeChart flow={data} />
              <ThroughputChart flow={data} />
              <FlowDonuts flow={data} />
            </div>
          )}
          <Link href={`/boards/${boardId}/flow`} className="text-sm font-medium hover:underline"><Trans>Open the full report, to save as PDF or Markdown →</Trans></Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CycleTimeChart({ flow }: { flow: BoardFlow }) {
  const { t, i18n } = useLingui();
  const fmtDays = (days: number) => t`${plural(Number(days.toFixed(1)), { one: '# day', other: '# days' })}`;
  const known = cycleTimePoints(flow);
  const config = { days: { label: t`Cycle time`, color: 'var(--chart-1)' } } satisfies ChartConfig;
  const highest = Math.max(1, ...known.map((ticket) => ticket.days), flow.p85_cycle_days ?? 0);

  return (
    <section className="grid grid-cols-1 gap-2">
      <h3 className="font-semibold"><Trans>Cycle time</Trans></h3>
      {known.length === 0 ? (
        <p className="text-sm text-muted-foreground"><Trans>Cycle time will appear after a ticket with a recorded start is completed.</Trans></p>
      ) : (
        <>
          <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label={t`Completed tickets plotted by completion date and cycle time`}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid />
              <XAxis dataKey="at" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(value: number) => dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(value)} tickLine={false} axisLine={false} />
              <YAxis dataKey="days" type="number" domain={[0, highest * 1.12]} tickFormatter={(value: number) => t`${value}d`} tickLine={false} axisLine={false} width={38} />
              <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.key ?? ''} formatter={(value, _name, item) => <span>{fmtDays(Number(value))} · {String(item.payload.title)}</span>} />} />
              {flow.median_cycle_days !== null && <ReferenceLine y={flow.median_cycle_days} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
              {flow.p85_cycle_days !== null && <ReferenceLine y={flow.p85_cycle_days} stroke="var(--foreground)" strokeDasharray="2 3" />}
              <Scatter data={known} dataKey="days" fill="var(--color-days)" />
            </ScatterChart>
          </ChartContainer>
          <p className="text-sm text-muted-foreground">
            {flow.median_cycle_days !== null && <Trans>Median: <strong className="text-foreground">{fmtDays(flow.median_cycle_days)}</strong> (dashed line)</Trans>}
            {flow.median_cycle_days !== null && flow.p85_cycle_days !== null && ' · '}
            {flow.p85_cycle_days !== null && <Trans>85th percentile: <strong className="text-foreground">{fmtDays(flow.p85_cycle_days)}</strong> (dotted line)</Trans>}
          </p>
        </>
      )}
    </section>
  );
}

export function ThroughputChart({ flow }: { flow: BoardFlow }) {
  const { t, i18n } = useLingui();
  const data = flow.throughput.map((week) => ({ ...week, label: dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${week.week_start}T00:00:00Z`)) }));
  const config = { tickets: { label: t`Tickets completed`, color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <section className="grid grid-cols-1 gap-2">
      <h3 className="font-semibold"><Trans>Weekly throughput</Trans></h3>
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label={t`Tickets completed per week`}>
        <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week_start" tickFormatter={(value: string) => dates(i18n, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''} />} />
          <Bar dataKey="tickets" fill="var(--color-tickets)" radius={4} isAnimationActive={false}>
            <LabelList dataKey="tickets" position="top" className="fill-foreground" fontSize={11} formatter={(value) => fmtCount(Number(value))} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-sm text-muted-foreground"><Trans>Tickets completed each week. The chart includes weeks with no completions.</Trans></p>
    </section>
  );
}

// FlowDonuts: what's open in each column now, and what got done by type (TL-622).
export function FlowDonuts({ flow }: { flow: BoardFlow }) {
  const { t, i18n } = useLingui();
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 print:grid-cols-2">
      <Donut title={t`Open by column`} note={t`Tickets open in each column now, Done left out.`}
        data={(flow.wip ?? []).map((w) => ({ key: w.column_id, label: w.column, value: w.tickets }))} />
      <Donut title={t`Done by type`} note={t`Tickets finished in the period, by type.`}
        data={(flow.mix ?? []).map((m) => ({ key: m.type, label: TYPE_LABEL[m.type] ? i18n._(TYPE_LABEL[m.type]) : m.type, value: m.tickets }))} />
    </div>
  );
}
