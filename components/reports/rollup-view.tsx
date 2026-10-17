'use client';

import Link from 'next/link';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportTotals, RollupReport } from '@/lib/api';
import { num, pct, trend, writeQuery, type Range } from '@/lib/sprint-report';

// RollupView: a project's sprint boards together, or every project in the organization (TL-400, on
// TL-398). Points and tickets are never added together; predictability compares across both.
export function RollupView({ report, range }: { report: RollupReport; range: Range }) {
  const { overall, previous } = report;
  // a project's parts are its boards, the organization's its projects
  const parts = report.boards
    ? report.boards.map((b) => ({ key: b.board_id, name: b.board_name, href: writeQuery({ kind: 'board', id: b.board_id }, range), sprints: b.totals.sprints, predictability: b.totals.predictability, done: `${num(b.totals.done)} ${b.unit}`, goals: goals(b.sprints) }))
    : (report.projects ?? []).map((p) => ({ key: p.id ?? p.name, name: p.name, href: writeQuery({ kind: 'project', id: p.id ?? '' }, range), sprints: p.overall.sprints, predictability: p.overall.predictability, done: delivered(p.points, p.tickets), goals: `${p.overall.goals_met} of ${p.overall.goals_set}` }));
  const partName = report.boards ? 'Board' : 'Project';
  const months = (report.months ?? []).map((m) => ({ month: monthLabel(m.month), predictability: m.predictability == null ? null : Math.round(m.predictability * 100), points: m.points_done, tickets: m.tickets_done }));
  const t = trend(overall.predictability, previous.predictability);
  const Icon = t === 'up' ? ArrowUpIcon : t === 'down' ? ArrowDownIcon : ArrowRightIcon;
  return (
    <div className="grid gap-10">
      <p className="text-xl font-medium" data-summary>{report.summary}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:break-after-page">
        <Card>
          <CardHeader>
            <CardDescription>Predictability</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
              {pct(overall.predictability)}
              {t && <Icon aria-label={t === 'same' ? 'the same as the period before' : `${t} on the period before`} className="size-5 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">of planned work done, across {overall.sprints} sprint{overall.sprints === 1 ? '' : 's'}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Sprint goals met</CardDescription><CardTitle className="text-3xl tabular-nums">{overall.goals_set ? `${overall.goals_met} of ${overall.goals_set}` : '–'}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">sprints that set a goal</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Points delivered</CardDescription><CardTitle className="text-3xl tabular-nums">{report.points ? num(report.points.done) : '–'}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{report.points ? `of ${num(report.points.planned)} planned, on boards that estimate` : 'no boards estimate'}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Tickets delivered</CardDescription><CardTitle className="text-3xl tabular-nums">{report.tickets ? num(report.tickets.done) : '–'}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{report.tickets ? `of ${num(report.tickets.planned)} planned, on boards that count tickets` : 'every board estimates'}</CardContent>
        </Card>
      </div>

      {overall.sprints === 0 && parts.every((p) => p.sprints === 0) ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No sprints finished in this period. Try a longer one.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2 print:grid-cols-1">
          <ChartCard title={`${partName}s side by side`} note={`Each ${partName.toLowerCase()}'s share of planned work done in the period. The band, 80–100%, is on target.`}>
            <BarChart data={parts.map((p) => ({ name: p.name, predictability: p.predictability == null ? 0 : Math.round(p.predictability * 100) }))} margin={{ top: 8, left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis domain={[0, (max: number) => Math.max(120, max)]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
              <ReferenceArea y1={80} y2={100} fill="var(--muted)" fillOpacity={0.6} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="predictability" fill="var(--color-predictability)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartCard>
          {months.length > 0 && (
            <ChartCard title="Predictability by month" note="Share of planned work done by sprints that finished each month, across every board.">
              <LineChart data={months} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis domain={[0, (max: number) => Math.max(120, max)]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
                <ReferenceArea y1={80} y2={100} fill="var(--muted)" fillOpacity={0.6} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="predictability" stroke="var(--color-predictability)" strokeWidth={2} connectNulls isAnimationActive={false} />
              </LineChart>
            </ChartCard>
          )}
          {months.length > 0 && (report.points || report.tickets) && (
            <ChartCard title="Delivered by month" note="What finished each month: points on boards that estimate, tickets on boards that don't (never added together).">
              <BarChart data={months} margin={{ top: 8, left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {report.points && <Bar dataKey="points" fill="var(--color-points)" radius={4} isAnimationActive={false} />}
                {report.tickets && <Bar dataKey="tickets" fill="var(--color-tickets)" radius={4} isAnimationActive={false} />}
              </BarChart>
            </ChartCard>
          )}
        </div>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{partName}s</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>{[partName, 'Sprints', 'Predictability', 'Delivered', 'Goals met'].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-medium"><Link href={p.href} className="hover:underline">{p.name}</Link></TableCell>
                  <TableCell>{p.sprints}</TableCell>
                  <TableCell>{pct(p.predictability)}</TableCell>
                  <TableCell>{p.done}</TableCell>
                  <TableCell>{p.goals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

const goals = (sprints: { goal_met: boolean | null }[]) => {
  const set = sprints.filter((s) => s.goal_met != null);
  return set.length ? `${set.filter((s) => s.goal_met).length} of ${set.length}` : '–';
};

// delivered: a project's done work, points and tickets kept apart ("13 points · 4 tickets").
export function delivered(points: ReportTotals | null, tickets: ReportTotals | null): string {
  const parts = [points && `${num(points.done)} points`, tickets && `${num(tickets.done)} tickets`].filter(Boolean);
  return parts.length ? parts.join(' · ') : '–';
}

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
export const monthLabel = (ym: string) => monthFmt.format(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1));

const SERIES = {
  predictability: { label: 'Predictability %', color: 'var(--chart-1)' },
  points: { label: 'Points', color: 'var(--chart-1)' },
  tickets: { label: 'Tickets', color: 'var(--chart-2)' },
} satisfies ChartConfig;

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactElement }) {
  return (
    <section className="grid gap-2 break-inside-avoid print:break-after-page" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      <ChartContainer config={SERIES} className="aspect-auto h-64 w-full" aria-label={`${title}: ${note}`}>{children}</ChartContainer>
      <p className="text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
