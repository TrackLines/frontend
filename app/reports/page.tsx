'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFlags } from '@flags-gg/react-library';
import { LoadError } from '@/components/load-error';
import { ReportView } from '@/components/reports/report-view';
import { RollupView } from '@/components/reports/rollup-view';
import { ExportMenu, PrintCover } from '@/components/reports/export-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiError, reports, type BoardReport, type RollupReport } from '@/lib/api';
import { presetOf, presetRange, PRESETS, readQuery, writeQuery, type Preset, type Range } from '@/lib/sprint-report';
import { useToken } from '@/lib/use-token';

// /reports?board=<id> | ?project=<id> | ?org=1, &from=&to=: a sprint report (TL-400). The address is the report: share it.
export default function ReportsPage() {
  return <Suspense><Reports /></Suspense>;
}

function Reports() {
  const token = useToken();
  const router = useRouter();
  const q = useSearchParams();
  const { is } = useFlags();
  const { scope, range } = readQuery(new URLSearchParams(q.toString()));
  const [report, setReport] = useState<BoardReport | null>(null);
  const [rollup, setRollup] = useState<RollupReport | null>(null);
  const [error, setError] = useState<number | null>(null);
  const key = `${scope?.kind}:${scope && 'id' in scope ? scope.id : ''}:${range.from}:${range.to}`;
  const loaded = token !== null;
  useEffect(() => {
    if (!loaded || !scope) return;
    setReport(null);
    setRollup(null);
    setError(null);
    const failed = (e: unknown) => setError(e instanceof ApiError ? e.status : 500);
    if (scope.kind === 'board') reports.board(scope.id, range, token).then(setReport, failed);
    else if (scope.kind === 'project') reports.project(scope.id, range, token).then(setRollup, failed);
    else reports.org(range, token).then(setRollup, failed);
  }, [key, loaded]); // token refreshes must not refetch

  if (is('sprint-reports').disabled()) return <Message>Sprint reports aren’t available yet.</Message>;
  if (!scope) return <Message>Open a report from a board’s past sprints, a project, or organization settings.</Message>;
  if (error === 403) return <Message>Only organization admins can see the organization’s report.</Message>;
  if (error) return <LoadError status={error} thing={scope.kind === 'project' ? 'project' : 'board'} />;

  const go = (r: Range) => router.replace(writeQuery(scope, r), { scroll: false });
  const preset = presetOf(range);
  return (
    <main className="report-print mx-auto max-w-6xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
      {(report || rollup) && <PrintCover title={report?.board_name ?? rollup!.name} kind={scope.kind === 'board' ? 'board' : scope.kind === 'project' ? 'project' : 'organization'} range={range} />}
      {report && <Link href={`/boards/${report.board_id}`} className="text-sm text-muted-foreground hover:underline print:hidden">← {report.board_name}</Link>}
      {rollup && scope.kind === 'project' && <Link href={`/projects/${scope.id}`} className="text-sm text-muted-foreground hover:underline print:hidden">← {rollup.name}</Link>}
      {rollup && scope.kind === 'org' && <Link href="/settings" className="text-sm text-muted-foreground hover:underline print:hidden">← Settings</Link>}
      <header className="mt-2 mb-8 grid gap-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
          <p className="text-sm font-bold tracking-[.14em] text-primary uppercase">Sprint report</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{report?.board_name ?? rollup?.name ?? '…'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{range.from} to {range.to}</p>
          </div>
          {(report || rollup) && token && <ExportMenu scope={scope} range={range} name={report?.board_name ?? rollup!.name} token={token} />}
        </div>
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <ToggleGroup size="sm" variant="outline" aria-label="Period" value={preset ? [preset] : []}
            onValueChange={(v) => { if (v[0]) go(presetRange(v[0] as Preset)); }}>
            {PRESETS.map((p) => <ToggleGroupItem key={p.id} value={p.id}>{p.label}</ToggleGroupItem>)}
          </ToggleGroup>
          <label className="grid gap-1 text-xs text-muted-foreground">From
            <Input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && go({ ...range, from: e.target.value })} className="h-8" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">To
            <Input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && go({ ...range, to: e.target.value })} className="h-8" />
          </label>
        </div>
      </header>
      {report ? <ReportView report={report} /> : rollup ? <RollupView report={rollup} range={range} /> : <Skeleton role="status" aria-label="Loading the report…" className="h-96 w-full" />}
    </main>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-xl px-6 py-16 text-muted-foreground">{children}</main>;
}
