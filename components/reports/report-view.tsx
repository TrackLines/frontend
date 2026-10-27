'use client';

import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, CheckIcon, XIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BoardReport, ReportSpikes, SprintReport } from '@/lib/api';
import { num, pct, scopeChange, trend, TYPE_LABEL } from '@/lib/sprint/sprint-report';
import { Donut } from './donut';
import { dates } from '@/lib/i18n';

// ReportView: one board's sprint report (TL-400), laid out for showing to leadership: the summary,
// headline cards, charts, goals, then the detail. Never per person (TL-396).
export function ReportView({ report }: { report: BoardReport }) {
  const { t, i18n } = useLingui();
  const { totals, previous, unit, sprints } = report;
  const closed = sprints.filter((s) => s.closed_at);
  const label = (s: SprintReport) => { const n = s.number; return s.closed_at ? t`Sprint ${n}` : t`Sprint ${n} (so far)`; };
  const points = unit === 'points';
  const done = num(totals.done), planned = num(totals.planned);
  return (
    <div className="grid gap-10">
      <p className="text-xl font-medium" data-summary>{report.summary}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 print:break-after-page">
        <Headline title={t`Delivered`} value={t`${done} of ${planned}`} note={points ? t`points planned, across ${plural(totals.sprints, { one: '# sprint', other: '# sprints' })}` : t`tickets planned, across ${plural(totals.sprints, { one: '# sprint', other: '# sprints' })}`} />
        <Headline title={t`Predictability`} value={pct(totals.predictability)} note={t`of planned work done`} trend={trend(totals.predictability, previous.predictability)} />
        <Headline title={t`Velocity`} value={totals.velocity == null ? '–' : num(totals.velocity)} note={points ? t`points per sprint` : t`tickets per sprint`} trend={trend(totals.velocity, previous.velocity)} />
        <Headline title={t`Scope change`} value={pct(scopeChange(totals))} note={t`added after sprints started`} />
        <Headline title={t`Carried over`} value={totals.carried == null ? '–' : num(totals.carried)} note={points ? t`points unfinished at the end` : t`tickets unfinished at the end`} />
      </div>

      {report.spikes && report.spikes.done > 0 && <SpikeLine spikes={report.spikes} />}

      {sprints.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><Trans>No sprints in this period. Try a longer one.</Trans></p>
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-2 print:grid-cols-1">
            <ChartCard title={t`Planned vs delivered`} note={points ? t`What each sprint planned at its start, and what it finished, in points.` : t`What each sprint planned at its start, and what it finished, in tickets.`}>
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

            <ChartCard title={t`Velocity`} note={points ? t`Finished per sprint, and the average of the last three (the line), in points.` : t`Finished per sprint, and the average of the last three (the line), in tickets.`} empty={closed.length === 0}>
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

            <ChartCard title={t`Predictability`} note={t`Share of planned work done each sprint. The band, 80–100%, is on target.`} empty={closed.length === 0}>
              <LineChart data={closed.map((s) => ({ sprint: label(s), predictability: s.predictability == null ? null : Math.round(s.predictability * 100) }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis domain={[0, (max: number) => Math.max(120, max)]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
                <ReferenceArea y1={80} y2={100} fill="var(--muted)" fillOpacity={0.6} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="predictability" stroke="var(--color-predictability)" strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ChartCard>

            <ChartCard title={t`Scope change`} note={points ? t`What each sprint started with, what was added and removed along the way, and what carried over, in points.` : t`What each sprint started with, what was added and removed along the way, and what carried over, in tickets.`} empty={!closed.some((s) => s.added != null)}>
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

            <ChartCard title={t`Work mix`} note={t`What got done each sprint, by type: how much went on fixing versus building.`} empty={closed.length === 0}>
              <BarChart data={closed.map((s) => ({ sprint: label(s), ...Object.fromEntries(s.mix.map((m) => [m.type, m.value])) }))} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {['bug', 'feature', 'task', 'spike'].map((ty) => <Bar key={ty} dataKey={ty} stackId="mix" fill={`var(--color-${ty})`} isAnimationActive={false} />)}
              </BarChart>
            </ChartCard>
          </div>

          {/* shares across the whole period (TL-619): what the work went on, and how goals went */}
          <div className="grid gap-8 lg:grid-cols-2 print:grid-cols-2 print:break-after-page">
            <Donut title={t`Work mix, whole period`} note={points ? t`Everything finished in the period, by type, in points.` : t`Everything finished in the period, by type, in tickets.`}
              data={totals.mix.map((m) => ({ key: m.type, label: TYPE_LABEL[m.type] ? i18n._(TYPE_LABEL[m.type]) : m.type, value: m.value }))} />
            <Donut title={t`Sprint goals`} note={t`Finished sprints that set a goal: met or not.`}
              data={[{ key: 'met', label: t`Met`, value: closed.filter((s) => s.goal && s.goal_met === true).length },
                { key: 'missed', label: t`Not met`, value: closed.filter((s) => s.goal && s.goal_met === false).length }]} />
          </div>

          {sprints.some((s) => s.goal) && (
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold"><Trans>Sprint goals</Trans></h2>
              <ul className="grid gap-2">
                {sprints.filter((s) => s.goal).map((s) => (
                  <li key={s.number} className="flex items-start gap-2 text-sm">
                    {s.goal_met == null ? <span className="mt-0.5 size-4 shrink-0" />
                      : s.goal_met ? <CheckIcon aria-label={t`Met`} className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      : <XIcon aria-label={t`Not met`} className="mt-0.5 size-4 shrink-0 text-destructive" />}
                    <span><span className="font-medium">{label(s)}:</span> {s.goal}{s.goal_met == null && <span className="text-muted-foreground"> <Trans>(in progress)</Trans></span>}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3">
            <h2 className="text-lg font-semibold"><Trans>Sprint by sprint</Trans></h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[t`Sprint`, t`Dates`, t`Planned`, t`Added`, t`Removed`, t`Done`, t`Carried`, t`Predictability`].map((h) => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sprints.map((s) => (
                    <TableRow key={s.number}>
                      <TableCell className="font-medium">{label(s)}</TableCell>
                      <TableCell className="text-muted-foreground">{sprintDates(i18n, s)}</TableCell>
                      <TableCell>{num(s.planned)}{s.estimated && <span title={t`Recorded before reports: what it held when it closed`} className="text-muted-foreground">*</span>}</TableCell>
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
              <p className="text-xs text-muted-foreground"><Trans>* From before reports were recorded: planned is what the sprint held when it closed, and what was added or removed isn’t known.</Trans></p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const sprintDates = (i18n: I18n, s: SprintReport) => {
  const day = dates(i18n, { day: 'numeric', month: 'short' });
  return `${day.format(new Date(s.starts_at))} – ${day.format(new Date(s.closed_at ?? s.ends_at))}`;
};

// SpikeLine: how timeboxed spikes went (TL-509): finished, within their timebox, over (and by how
// long, in working hours). Shown only when a spike finished in the period.
export function SpikeLine({ spikes }: { spikes: ReportSpikes }) {
  const { t } = useLingui();
  const { within, over } = spikes;
  const hours = num(spikes.over_hours);
  return (
    <section aria-label={t`Spikes`} className="grid gap-1">
      <h2 className="text-lg font-semibold"><Trans>Spikes</Trans></h2>
      <p className="text-sm">
        {over > 0
          ? <Trans><Plural value={spikes.done} one="# timeboxed spike" other="# timeboxed spikes" /> finished: <span className="font-medium">{within} within</span> their timebox, <span className="font-medium text-destructive">{over} over</span> by <Plural value={spikes.over_hours} one={`${hours} working hour`} other={`${hours} working hours`} /> in all.</Trans>
          : <Trans><Plural value={spikes.done} one="# timeboxed spike" other="# timeboxed spikes" /> finished: <span className="font-medium">{within} within</span> their timebox.</Trans>}
      </p>
      <p className="text-xs text-muted-foreground"><Trans>Timeboxes count working hours, Monday to Friday, 9:00 to 17:00.</Trans></p>
    </section>
  );
}

function Headline({ title, value, note, trend: dir }: { title: string; value: string; note: string; trend?: 'up' | 'down' | 'same' | null }) {
  const { t } = useLingui();
  const Icon = dir === 'up' ? ArrowUpIcon : dir === 'down' ? ArrowDownIcon : ArrowRightIcon;
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
          {value}
          {dir && <Icon aria-label={dir === 'same' ? t`the same as the period before` : dir === 'up' ? t`up on the period before` : t`down on the period before`} className="size-5 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{note}</CardContent>
    </Card>
  );
}

// the charts' series: theme colours, so they read in light and dark mode (labels translated in ChartCard)
const SERIES = {
  planned: { label: msg`Planned`, color: 'var(--chart-2)' },
  done: { label: msg`Done`, color: 'var(--chart-1)' },
  velocity: { label: msg`Velocity (3-sprint average)`, color: 'var(--chart-3)' },
  predictability: { label: msg`Predictability %`, color: 'var(--chart-1)' },
  added: { label: msg`Added`, color: 'var(--chart-3)' },
  removed: { label: msg`Removed`, color: 'var(--chart-4)' },
  carried: { label: msg`Carried over`, color: 'var(--chart-5)' },
  bug: { label: TYPE_LABEL.bug, color: 'var(--chart-4)' },
  feature: { label: TYPE_LABEL.feature, color: 'var(--chart-1)' },
  task: { label: TYPE_LABEL.task, color: 'var(--chart-2)' },
  spike: { label: TYPE_LABEL.spike, color: 'var(--chart-5)' },
};

// ChartCard: a chart with its title and a sentence saying what it shows (its text label).
function ChartCard({ title, note, empty, children }: { title: string; note: string; empty?: boolean; children: ReactNode }) {
  const { i18n } = useLingui();
  const config: ChartConfig = Object.fromEntries(Object.entries(SERIES).map(([k, v]) => [k, { ...v, label: i18n._(v.label) }]));
  return (
    <section className="grid gap-2 break-inside-avoid print:break-after-page" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {empty ? <p className="text-sm text-muted-foreground"><Trans>Not enough finished sprints in this period yet.</Trans></p> : (
        <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-label={`${title}: ${note}`}>
          {children as React.ReactElement}
        </ChartContainer>
      )}
      <p className="text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
