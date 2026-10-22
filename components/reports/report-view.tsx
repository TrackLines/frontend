'use client';

import type { ReactNode } from 'react';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, CheckIcon, XIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BoardReport, ReportSpikes, SprintReport } from '@/lib/api';
import { num, pct, scopeChange, trend, TYPE_LABEL } from '@/lib/sprint-report';

// ReportView: one board's sprint report (TL-400), laid out for showing to leadership: the summary,
// headline cards, charts, goals, then the detail. Never per person (TL-396).
export function ReportView({ report }: { report: BoardReport }) {
  const { totals, previous, unit, sprints } = report;
  const closed = sprints.filter((s) => s.closed_at);
  const label = (s: SprintReport) => (s.closed_at ? `Sprint ${s.number}` : `Sprint ${s.number} (so far)`);
  const unitName = unit === 'points' ? 'points' : 'tickets';
  return (
    <div className="grid gap-10">
      <p className="text-xl font-medium" data-summary>{report.summary}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 print:break-after-page">
        <Headline title="Delivered" value={`${num(totals.done)} of ${num(totals.planned)}`} note={`${unitName} planned, across ${totals.sprints} sprint${totals.sprints === 1 ? '' : 's'}`} />
        <Headline title="Predictability" value={pct(totals.predictability)} note="of planned work done" trend={trend(totals.predictability, previous.predictability)} />
        <Headline title="Velocity" value={totals.velocity == null ? '–' : num(totals.velocity)} note={`${unitName} per sprint`} trend={trend(totals.velocity, previous.velocity)} />
        <Headline title="Scope change" value={pct(scopeChange(totals))} note="added after sprints started" />
        <Headline title="Carried over" value={totals.carried == null ? '–' : num(totals.carried)} note={`${unitName} unfinished at the end`} />
      </div>

      {report.spikes && report.spikes.done > 0 && <SpikeLine spikes={report.spikes} />}

      {sprints.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No sprints in this period. Try a longer one.</p>
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-2 print:grid-cols-1">
            <ChartCard title="Planned vs delivered" note={`What each sprint planned at its start, and what it finished, in ${unitName}.`}>
              <BarChart data={sprints.map((s) => ({ sprint: label(s), planned: s.planned, done: s.done }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="planned" fill="var(--color-planned)" radius={4} isAnimationActive={false} />
                <Bar dataKey="done" fill="var(--color-done)" radius={4} isAnimationActive={false} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Velocity" note={`Finished per sprint, and the average of the last three (the line), in ${unitName}.`} empty={closed.length === 0}>
              <LineChart data={closed.map((s) => ({ sprint: label(s), done: s.done, velocity: s.velocity }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="done" stroke="var(--color-done)" strokeWidth={2} isAnimationActive={false} />
                <Line dataKey="velocity" stroke="var(--color-velocity)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </LineChart>
            </ChartCard>

            <ChartCard title="Predictability" note="Share of planned work done each sprint. The band, 80–100%, is on target." empty={closed.length === 0}>
              <LineChart data={closed.map((s) => ({ sprint: label(s), predictability: s.predictability == null ? null : Math.round(s.predictability * 100) }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis domain={[0, (max: number) => Math.max(120, max)]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
                <ReferenceArea y1={80} y2={100} fill="var(--muted)" fillOpacity={0.6} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="predictability" stroke="var(--color-predictability)" strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ChartCard>

            <ChartCard title="Scope change" note={`What each sprint started with, what was added and removed along the way, and what carried over, in ${unitName}.`} empty={!closed.some((s) => s.added != null)}>
              <BarChart data={closed.filter((s) => s.added != null).map((s) => ({ sprint: label(s), planned: s.planned, added: s.added, removed: s.removed, carried: s.carried }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="planned" stackId="scope" fill="var(--color-planned)" isAnimationActive={false} />
                <Bar dataKey="added" stackId="scope" fill="var(--color-added)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="removed" fill="var(--color-removed)" radius={4} isAnimationActive={false} />
                <Bar dataKey="carried" fill="var(--color-carried)" radius={4} isAnimationActive={false} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Work mix" note="What got done each sprint, by type: how much went on fixing versus building." empty={closed.length === 0}>
              <BarChart data={closed.map((s) => ({ sprint: label(s), ...Object.fromEntries(s.mix.map((m) => [m.type, m.value])) }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {['bug', 'feature', 'task', 'spike'].map((t) => <Bar key={t} dataKey={t} stackId="mix" fill={`var(--color-${t})`} isAnimationActive={false} />)}
              </BarChart>
            </ChartCard>
          </div>

          {sprints.some((s) => s.goal) && (
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">Sprint goals</h2>
              <ul className="grid gap-2">
                {sprints.filter((s) => s.goal).map((s) => (
                  <li key={s.number} className="flex items-start gap-2 text-sm">
                    {s.goal_met == null ? <span className="mt-0.5 size-4 shrink-0" />
                      : s.goal_met ? <CheckIcon aria-label="Met" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      : <XIcon aria-label="Not met" className="mt-0.5 size-4 shrink-0 text-destructive" />}
                    <span><span className="font-medium">{label(s)}:</span> {s.goal}{s.goal_met == null && <span className="text-muted-foreground"> (in progress)</span>}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">Sprint by sprint</h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Sprint', 'Dates', 'Planned', 'Added', 'Removed', 'Done', 'Carried', 'Predictability'].map((h) => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sprints.map((s) => (
                    <TableRow key={s.number}>
                      <TableCell className="font-medium">{label(s)}</TableCell>
                      <TableCell className="text-muted-foreground">{dates(s)}</TableCell>
                      <TableCell>{num(s.planned)}{s.estimated && <span title="Recorded before reports: what it held when it closed" className="text-muted-foreground">*</span>}</TableCell>
                      <TableCell>{s.added == null ? '–' : num(s.added)}</TableCell>
                      <TableCell>{s.removed == null ? '–' : num(s.removed)}</TableCell>
                      <TableCell>{num(s.done)}</TableCell>
                      <TableCell>{s.carried == null ? '–' : num(s.carried)}</TableCell>
                      <TableCell>{pct(s.predictability)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sprints.some((s) => s.estimated) && (
              <p className="text-xs text-muted-foreground">* From before reports were recorded: planned is what the sprint held when it closed, and what was added or removed isn’t known.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const dates = (s: SprintReport) => `${dayFmt.format(new Date(s.starts_at))} – ${dayFmt.format(new Date(s.closed_at ?? s.ends_at))}`;

// SpikeLine: how timeboxed spikes went (TL-509): finished, within their timebox, over (and by how
// long, in working hours). Shown only when a spike finished in the period.
export function SpikeLine({ spikes }: { spikes: ReportSpikes }) {
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return (
    <section aria-label="Spikes" className="grid gap-1">
      <h2 className="text-lg font-semibold">Spikes</h2>
      <p className="text-sm">
        {plural(spikes.done, 'timeboxed spike')} finished: <span className="font-medium">{spikes.within} within</span> their timebox
        {spikes.over > 0 && <>, <span className="font-medium text-destructive">{spikes.over} over</span> by {num(spikes.over_hours)} working hour{spikes.over_hours === 1 ? '' : 's'} in all</>}.
      </p>
      <p className="text-xs text-muted-foreground">Timeboxes count working hours, Monday to Friday, 9:00 to 17:00.</p>
    </section>
  );
}

function Headline({ title, value, note, trend: t }: { title: string; value: string; note: string; trend?: 'up' | 'down' | 'same' | null }) {
  const Icon = t === 'up' ? ArrowUpIcon : t === 'down' ? ArrowDownIcon : ArrowRightIcon;
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
          {value}
          {t && <Icon aria-label={t === 'same' ? 'the same as the period before' : `${t} on the period before`} className="size-5 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{note}</CardContent>
    </Card>
  );
}

// the charts' series: theme colours, so they read in light and dark mode
export const SERIES = {
  planned: { label: 'Planned', color: 'var(--chart-2)' },
  done: { label: 'Done', color: 'var(--chart-1)' },
  velocity: { label: 'Velocity (3-sprint average)', color: 'var(--chart-3)' },
  predictability: { label: 'Predictability %', color: 'var(--chart-1)' },
  added: { label: 'Added', color: 'var(--chart-3)' },
  removed: { label: 'Removed', color: 'var(--chart-4)' },
  carried: { label: 'Carried over', color: 'var(--chart-5)' },
  bug: { label: TYPE_LABEL.bug, color: 'var(--chart-4)' },
  feature: { label: TYPE_LABEL.feature, color: 'var(--chart-1)' },
  task: { label: TYPE_LABEL.task, color: 'var(--chart-2)' },
  spike: { label: TYPE_LABEL.spike, color: 'var(--chart-5)' },
} satisfies ChartConfig;

// ChartCard: a chart with its title and a sentence saying what it shows (its text label).
function ChartCard({ title, note, empty, children }: { title: string; note: string; empty?: boolean; children: ReactNode }) {
  return (
    <section className="grid gap-2 break-inside-avoid print:break-after-page" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {empty ? <p className="text-sm text-muted-foreground">Not enough finished sprints in this period yet.</p> : (
        <ChartContainer config={SERIES} className="aspect-auto h-64 w-full" aria-label={`${title}: ${note}`}>
          {children as React.ReactElement}
        </ChartContainer>
      )}
      <p className="text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
