'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from 'recharts';
import { boards, type BoardFlow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cycleTimePoints, flowChartState } from '@/lib/flow';

const compactDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtDays = (days: number) => `${Number(days.toFixed(1))} ${days === 1 ? 'day' : 'days'}`;
const fmtCount = (count: number) => String(count);

// FlowCharts reports continuous-flow board metrics; sprint boards use SprintBar's charts.
export function FlowCharts({ boardId, token }: { boardId: string; token: string }) {
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
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Charts</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kanban charts</DialogTitle>
            <DialogDescription>Cycle time and tickets completed per week over the last 12 weeks.</DialogDescription>
          </DialogHeader>
          {failed && <p role="alert" className="text-sm text-destructive">Couldn&apos;t load the charts. Please try again.</p>}
          {!data && !failed && <Skeleton role="status" aria-label="Loading charts…" className="h-56 w-full" />}
          {data && flowChartState(data) === 'empty' && (
            <p role="status" className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No tickets have been completed in the last 12 weeks yet. Charts will appear when work is finished.</p>
          )}
          {data && flowChartState(data) !== 'empty' && (
            <div className="grid grid-cols-1 gap-8">
              <CycleTimeChart flow={data} />
              <ThroughputChart flow={data} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CycleTimeChart({ flow }: { flow: BoardFlow }) {
  const known = cycleTimePoints(flow);
  const config = { days: { label: 'Cycle time', color: 'var(--chart-1)' } } satisfies ChartConfig;
  const highest = Math.max(1, ...known.map((ticket) => ticket.days), flow.p85_cycle_days ?? 0);

  return (
    <section className="grid grid-cols-1 gap-2">
      <h3 className="font-semibold">Cycle time</h3>
      {known.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cycle time will appear after a ticket with a recorded start is completed.</p>
      ) : (
        <>
          <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label="Completed tickets plotted by completion date and cycle time">
            <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid />
              <XAxis dataKey="at" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(value: number) => compactDate.format(value)} tickLine={false} axisLine={false} />
              <YAxis dataKey="days" type="number" domain={[0, highest * 1.12]} tickFormatter={(value: number) => `${value}d`} tickLine={false} axisLine={false} width={38} />
              <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.key ?? ''} formatter={(value, _name, item) => <span>{fmtDays(Number(value))} · {String(item.payload.title)}</span>} />} />
              {flow.median_cycle_days !== null && <ReferenceLine y={flow.median_cycle_days} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
              {flow.p85_cycle_days !== null && <ReferenceLine y={flow.p85_cycle_days} stroke="var(--foreground)" strokeDasharray="2 3" />}
              <Scatter data={known} dataKey="days" fill="var(--color-days)" />
            </ScatterChart>
          </ChartContainer>
          <p className="text-sm text-muted-foreground">
            {flow.median_cycle_days !== null && <>Median: <strong className="text-foreground">{fmtDays(flow.median_cycle_days)}</strong> (dashed line)</>}
            {flow.median_cycle_days !== null && flow.p85_cycle_days !== null && ' · '}
            {flow.p85_cycle_days !== null && <>85th percentile: <strong className="text-foreground">{fmtDays(flow.p85_cycle_days)}</strong> (dotted line)</>}
          </p>
        </>
      )}
    </section>
  );
}

function ThroughputChart({ flow }: { flow: BoardFlow }) {
  const data = flow.throughput.map((week) => ({ ...week, label: weekDate.format(new Date(`${week.week_start}T00:00:00Z`)) }));
  const config = { tickets: { label: 'Tickets completed', color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <section className="grid grid-cols-1 gap-2">
      <h3 className="font-semibold">Weekly throughput</h3>
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label="Tickets completed per week">
        <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week_start" tickFormatter={(value: string) => weekDate.format(new Date(`${value}T00:00:00Z`))} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''} />} />
          <Bar dataKey="tickets" fill="var(--color-tickets)" radius={4} isAnimationActive={false}>
            <LabelList dataKey="tickets" position="top" className="fill-foreground" fontSize={11} formatter={(value) => fmtCount(Number(value))} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-sm text-muted-foreground">Tickets completed each week. The chart includes weeks with no completions.</p>
    </section>
  );
}
