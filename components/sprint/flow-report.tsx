'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { CycleTimeChart, FlowDonuts, ThroughputChart } from '@/components/sprint/flow-charts';
import { Export, PrintCover } from '@/components/reports/export-menu';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { boards, type Board, type BoardFlow } from '@/lib/api';
import { flowFile, flowRange } from '@/lib/sprint/flow';

// FlowReport: a Kanban board's flow report (TL-622), on screen and as the PDF: headlines, throughput,
// cycle time, and what's open and done as donuts, with the Export menu.
export function FlowReport({ board, flow, token }: { board: Board; flow: BoardFlow; token: string }) {
  const { t } = useLingui();
  const range = flowRange(flow);
  const done = flow.tickets.length;
  const days = (d: number | null) => d == null ? '–' : t`${d.toFixed(1)} days`;
  return (
    <main className="report-print mx-auto max-w-6xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <PrintCover title={board.name} kind="" heading={t`Flow report`} range={range} />
      <Link href={`/boards/${board.id}`} className="text-sm text-muted-foreground hover:underline print:hidden">← {board.name}</Link>
      <header className="mt-2 mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><Trans>Flow report</Trans></h1>
          <p className="text-muted-foreground"><Trans>{board.name}, the last {flow.weeks} weeks</Trans></p>
        </div>
        <Export markdown={() => boards.flowMarkdown(board.id, token, flow.weeks)} file={flowFile(board.name)} />
      </header>
      <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3 print:break-after-page">
        <Card><CardHeader><CardDescription><Trans>Tickets done</Trans></CardDescription><CardTitle className="text-3xl tabular-nums">{done}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription><Trans>Median cycle time</Trans></CardDescription><CardTitle className="text-3xl tabular-nums">{days(flow.median_cycle_days)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription><Trans>85th percentile</Trans></CardDescription><CardTitle className="text-3xl tabular-nums">{days(flow.p85_cycle_days)}</CardTitle></CardHeader></Card>
      </div>
      {done === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><Trans>No tickets have been completed in this period yet.</Trans></p>
      ) : (
        <div className="mt-10 grid gap-10">
          <ThroughputChart flow={flow} />
          <CycleTimeChart flow={flow} />
          <FlowDonuts flow={flow} />
        </div>
      )}
    </main>
  );
}
