'use client';

import Link from 'next/link';
import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportTotals, RollupReport } from '@/lib/api';
import { num, pct, trend, writeQuery, type Range } from '@/lib/sprint-report';
import { dates } from '@/lib/i18n';

// RollupView: a project's sprint boards together, or every project in the organization (TL-400, on
// TL-398). Points and tickets are never added together; predictability compares across both.
export function RollupView({ report, range }: { report: RollupReport; range: Range }) {
  const { t, i18n } = useLingui();
  const { overall, previous } = report;
  // a project's parts are its boards, the organization's its projects
  const parts = report.boards
    ? report.boards.map((b) => ({ key: b.board_id, name: b.board_name, href: writeQuery({ kind: 'board', id: b.board_id }, range), sprints: b.totals.sprints, predictability: b.totals.predictability, done: b.unit === 'points' ? delivered(i18n, b.totals, null) : delivered(i18n, null, b.totals), goals: goals(i18n, b.sprints) }))
    : (report.projects ?? []).map((p) => ({ key: p.id ?? p.name, name: p.name, href: writeQuery({ kind: 'project', id: p.id ?? '' }, range), sprints: p.overall.sprints, predictability: p.overall.predictability, done: delivered(i18n, p.points, p.tickets), goals: ofTotal(i18n, p.overall.goals_met, p.overall.goals_set) }));
  const boards = !!report.boards;
  const months = (report.months ?? []).map((m) => ({ month: monthLabel(i18n, m.month), predictability: m.predictability == null ? null : Math.round(m.predictability * 100), points: m.points_done, tickets: m.tickets_done }));
  const dir = trend(overall.predictability, previous.predictability);
  const Icon = dir === 'up' ? ArrowUpIcon : dir === 'down' ? ArrowDownIcon : ArrowRightIcon;
  const sprints = overall.sprints;
  return (
    <div className="grid gap-10">
      <p className="text-xl font-medium" data-summary>{report.summary}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:break-after-page">
        <Card>
          <CardHeader>
            <CardDescription><Trans>Predictability</Trans></CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
              {pct(overall.predictability)}
              {dir && <Icon aria-label={dir === 'same' ? t`the same as the period before` : dir === 'up' ? t`up on the period before` : t`down on the period before`} className="size-5 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t`of planned work done, across ${plural(sprints, { one: '# sprint', other: '# sprints' })}`}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription><Trans>Sprint goals met</Trans></CardDescription><CardTitle className="text-3xl tabular-nums">{overall.goals_set ? ofTotal(i18n, overall.goals_met, overall.goals_set) : '–'}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground"><Trans>sprints that set a goal</Trans></CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription><Trans>Points delivered</Trans></CardDescription><CardTitle className="text-3xl tabular-nums">{report.points ? num(report.points.done) : '–'}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{report.points ? t`of ${num(report.points.planned)} planned, on boards that estimate` : t`no boards estimate`}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription><Trans>Tickets delivered</Trans></CardDescription><CardTitle className="text-3xl tabular-nums">{report.tickets ? num(report.tickets.done) : '–'}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{report.tickets ? t`of ${num(report.tickets.planned)} planned, on boards that count tickets` : t`every board estimates`}</CardContent>
        </Card>
      </div>

      {overall.sprints === 0 && parts.every((p) => p.sprints === 0) ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><Trans>No sprints finished in this period. Try a longer one.</Trans></p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2 print:grid-cols-1">
          <ChartCard title={boards ? t`Boards side by side` : t`Projects side by side`} note={boards ? t`Each board's share of planned work done in the period. The band, 80–100%, is on target.` : t`Each project's share of planned work done in the period. The band, 80–100%, is on target.`}>
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
            <ChartCard title={t`Predictability by month`} note={t`Share of planned work done by sprints that finished each month, across every board.`}>
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
            <ChartCard title={t`Delivered by month`} note={t`What finished each month: points on boards that estimate, tickets on boards that don't (never added together).`}>
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
        <h2 className="text-lg font-semibold">{boards ? <Trans>Boards</Trans> : <Trans>Projects</Trans>}</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>{[boards ? t`Board` : t`Project`, t`Sprints`, t`Predictability`, t`Delivered`, t`Goals met`].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
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

// ofTotal: "1 of 2"
const ofTotal = (i18n: I18n, n: number, total: number) => i18n._(msg`${n} of ${total}`);

const goals = (i18n: I18n, sprints: { goal_met: boolean | null }[]) => {
  const set = sprints.filter((s) => s.goal_met != null);
  return set.length ? ofTotal(i18n, set.filter((s) => s.goal_met).length, set.length) : '–';
};

// delivered: a project's done work, points and tickets kept apart ("13 points · 4 tickets").
export function delivered(i18n: I18n, points: ReportTotals | null, tickets: ReportTotals | null): string {
  const parts = [points && i18n._(msg`${plural(points.done, { one: '# point', other: '# points' })}`), tickets && i18n._(msg`${plural(tickets.done, { one: '# ticket', other: '# tickets' })}`)].filter(Boolean);
  return parts.length ? parts.join(' · ') : '–';
}

export const monthLabel = (i18n: I18n, ym: string) => dates(i18n, { month: 'short', year: 'numeric' }).format(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1));

// labels translated in ChartCard
const SERIES = {
  predictability: { label: msg`Predictability %`, color: 'var(--chart-1)' },
  points: { label: msg`Points`, color: 'var(--chart-1)' },
  tickets: { label: msg`Tickets`, color: 'var(--chart-2)' },
};

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactElement }) {
  const { i18n } = useLingui();
  const config: ChartConfig = Object.fromEntries(Object.entries(SERIES).map(([k, v]) => [k, { ...v, label: i18n._(v.label) }]));
  return (
    <section className="grid gap-2 break-inside-avoid print:break-after-page" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-label={`${title}: ${note}`}>{children}</ChartContainer>
      <p className="text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
