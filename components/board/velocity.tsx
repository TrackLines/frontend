'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sprints, type Burn, type Velocity } from '@/lib/api';
import { average, burnSteps, MIN_SPRINTS_FOR_VELOCITY } from '@/lib/burn';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

// Charts opens the board's sprint charts: burn-down/up for the open sprint, velocity once there's enough history.
export function Charts({ boardId, token }: { boardId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Velocity | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    sprints.velocity(boardId, token).then(setData, () => setFailed(true));
  }, [open, boardId]); // reload each time it opens; token refreshes must not refetch

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Charts</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sprint charts</DialogTitle>
            <DialogDescription>
              {data?.unit === 'tickets' ? 'Counted in tickets. Pick an estimate scale in Edit board to count points.' : 'Counted in estimate points.'}
            </DialogDescription>
          </DialogHeader>
          {failed && <p role="alert" className="text-sm text-destructive">Couldn&apos;t load the charts. Please try again.</p>}
          {!data && !failed && <Skeleton role="status" aria-label="Loading charts…" className="h-56 w-full" />}
          {data && (
            <div className="grid gap-8">
              {data.current ? <BurnChart burn={data.current} unit={data.unit} /> : <p className="text-sm text-muted-foreground">No sprint running, so there&apos;s nothing to burn down.</p>}
              <VelocityChart velocity={data} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BurnChart({ burn, unit, now = Date.now() }: { burn: Burn; unit: Velocity['unit']; now?: number }) {
  const [mode, setMode] = useState<'down' | 'up'>('down');
  const steps = burnSteps(burn, now);
  const start = Date.parse(burn.starts_at), end = Date.parse(burn.ends_at);
  const done = steps.at(-1)?.done ?? 0;
  const data = steps.map((s) => ({ at: s.at, value: mode === 'down' ? burn.total - s.done : s.done }));
  const config = { value: { label: mode === 'down' ? `${unit} left` : `${unit} done`, color: 'var(--chart-1)' } } satisfies ChartConfig;
  const summary = `${fmt(done)} of ${fmt(burn.total)} ${unit} done in sprint ${burn.number}`;

  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Sprint {burn.number}: {mode === 'down' ? 'burn-down' : 'burn-up'}</h3>
        <ToggleGroup size="sm" variant="outline" aria-label="Chart type" value={[mode]} onValueChange={(v) => { if (v[0]) setMode(v[0] as 'down' | 'up'); }}>
          <ToggleGroupItem value="down">Burn-down</ToggleGroupItem>
          <ToggleGroupItem value="up">Burn-up</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label={summary}>
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="at" type="number" scale="time" domain={[start, end]} ticks={[0, 1, 2, 3, 4].map((i) => start + ((end - start) * i) / 4)} tickFormatter={(t: number) => day.format(t)} tickLine={false} axisLine={false} />
          <YAxis domain={[0, Math.max(burn.total, done, 1)]} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => day.format(Number(p?.[0]?.payload?.at))} />} />
          {mode === 'down'
            ? <ReferenceLine segment={[{ x: start, y: burn.total }, { x: end, y: 0 }]} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            : <ReferenceLine y={burn.total} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
          <Line dataKey="value" type="stepAfter" stroke="var(--color-value)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ChartContainer>
      <p className="text-sm text-muted-foreground">
        {summary}. Dashed line: {mode === 'down' ? 'ideal pace' : 'scope'}.
        {burn.unestimated > 0 && ` ${burn.unestimated} ${burn.unestimated === 1 ? 'ticket has no estimate and counts' : 'tickets have no estimate and count'} as 0.`}
        {' '}Scope is today&apos;s; tickets added mid-sprint move the whole line.
      </p>
    </section>
  );
}

export function VelocityChart({ velocity }: { velocity: Velocity }) {
  const avg = average(velocity);
  const closed = velocity.sprints.length;
  if (avg === null) {
    return (
      <section className="grid gap-1">
        <h3 className="font-semibold">Velocity</h3>
        <p className="text-sm text-muted-foreground">
          Velocity shows up after {MIN_SPRINTS_FOR_VELOCITY} closed sprints, so there&apos;s enough to compare. {closed === 0 ? 'None closed yet.' : `${closed} closed so far.`}
        </p>
      </section>
    );
  }
  const data = velocity.sprints.slice(-12).map((s) => ({ sprint: `Sprint ${s.number}`, number: s.number, completed: s.completed }));
  const config = { completed: { label: velocity.unit === 'points' ? 'Points' : 'Tickets', color: 'var(--chart-1)' } } satisfies ChartConfig;
  return (
    <section className="grid gap-2">
      <h3 className="font-semibold">Velocity</h3>
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label={`Average ${fmt(avg)} ${velocity.unit} per sprint over the last ${MIN_SPRINTS_FOR_VELOCITY}`}>
        <BarChart data={data} margin={{ top: 20, left: 0, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="number" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="sprint" />} />
          <ReferenceLine y={avg} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          <Bar dataKey="completed" fill="var(--color-completed)" radius={4} isAnimationActive={false}>
            <LabelList dataKey="completed" position="top" className="fill-foreground" fontSize={11} formatter={(v) => fmt(Number(v))} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-sm text-muted-foreground">
        Average of the last {MIN_SPRINTS_FOR_VELOCITY} sprints: <strong className="text-foreground">{fmt(avg)} {velocity.unit}</strong> (dashed line). Bars are labelled by sprint number.
      </p>
    </section>
  );
}
