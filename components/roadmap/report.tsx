'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CopyIcon, DownloadIcon, FileTextIcon, PrinterIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Donut } from '@/components/reports/donut';
import { HealthBadge } from '@/components/roadmap/updates';
import { roadmaps, type Roadmap, type RoadmapBurnup, type RoadmapItem, type RoadmapUpdate } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { useToken } from '@/lib/use-token';

// The roadmap report (TL-617, on TL-616's endpoint): for the people who manage the roadmap, an
// Export menu (PDF by printing, Markdown from the server) and the print-only report it prints.

export type ItemState = 'done' | 'late' | 'in_progress' | 'not_started';

// itemState: an item's status, with "late" for one past its target date and not done (the same rule
// as the Markdown report).
export function itemState(item: RoadmapItem, today: string): ItemState {
  const status = item.status ?? item.manual_status ?? 'not_started';
  if (status === 'done') return 'done';
  if (item.target_date && item.target_date < today) return 'late';
  return status;
}

// roadmapFile: the Markdown download's name, as the server names it: "launch-roadmap-2026-10-25.md".
export function roadmapFile(title: string, day: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
  return `${slug}-roadmap-${day}.md`;
}

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local

export function RoadmapReport({ roadmap, updates }: { roadmap: Roadmap; updates: RoadmapUpdate[] }) {
  const token = useToken();
  const [burnup, setBurnup] = useState<RoadmapBurnup[]>([]);
  useEffect(() => {
    if (token) void roadmaps.report(roadmap.id, token).then((r) => setBurnup(r.burnup), () => setBurnup([]));
  }, [roadmap.id, token !== null]); // token refreshes must not refetch
  if (!token) return null;
  return (
    <>
      <RoadmapExport roadmap={roadmap} token={token} />
      <RoadmapPrint roadmap={roadmap} updates={updates} burnup={burnup} />
    </>
  );
}

function RoadmapExport({ roadmap, token }: { roadmap: Roadmap; token: string }) {
  const { t } = useLingui();
  const [status, setStatus] = useState('');
  async function markdown(then: (text: string) => Promise<void> | void, done: string) {
    setStatus('');
    try {
      await then(await roadmaps.reportMarkdown(roadmap.id, token));
      setStatus(done);
    } catch {
      setStatus(t`Couldn’t get the Markdown. Please try again.`);
    }
  }
  return (
    <div className="flex items-center gap-2 print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}><DownloadIcon /><Trans>Export</Trans></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.print()}><PrinterIcon /><Trans>Save as PDF (presentation)</Trans></DropdownMenuItem>
          <DropdownMenuItem onClick={() => void markdown((text) => {
            const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
            const a = Object.assign(document.createElement('a'), { href: url, download: roadmapFile(roadmap.title, today()) });
            a.click();
            URL.revokeObjectURL(url);
          }, t`Downloaded.`)}><FileTextIcon /><Trans>Download Markdown</Trans></DropdownMenuItem>
          <DropdownMenuItem onClick={() => void markdown((text) => navigator.clipboard.writeText(text), t`Copied as Markdown.`)}><CopyIcon /><Trans>Copy as Markdown</Trans></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {status && <span role="status" className="text-xs text-muted-foreground">{status}</span>}
    </div>
  );
}

// RoadmapPrint: the PDF's pages, only in print: a cover, then the charts (the page's own timeline
// and updates print after them).
export function RoadmapPrint({ roadmap, updates, burnup, generated = new Date() }: { roadmap: Roadmap; updates: RoadmapUpdate[]; burnup: RoadmapBurnup[]; generated?: Date }) {
  const { t, i18n } = useLingui();
  const items = roadmap.items ?? [];
  const day = generated.toLocaleDateString('en-CA');
  const states = items.map((i) => itemState(i, day));
  const count = (s: ItemState) => states.filter((x) => x === s).length;
  const when = dates(i18n, { dateStyle: 'long', timeStyle: 'short' }).format(generated);
  const short = dates(i18n, { day: 'numeric', month: 'short' });
  const config: ChartConfig = { done: { label: t`Done`, color: 'var(--chart-1)' }, total: { label: t`Total`, color: 'var(--chart-2)' } };
  const linked = items.filter((i) => (i.progress?.total ?? 0) > 0);
  const progress = roadmap.progress;
  return (
    <div className="hidden print:grid print:gap-10" data-roadmap-print>
      <section className="flex min-h-[80vh] flex-col justify-center gap-6 break-after-page" data-print-cover>
        {/* eslint-disable-next-line @next/next/no-img-element -- a plain img prints reliably */}
        <img src="/logo-tile.png" alt="TrackLin.es" width={56} height={56} className="size-14 rounded-xl" />
        <div>
          <p className="text-sm font-bold tracking-[.14em] uppercase"><Trans>Roadmap report</Trans></p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">{roadmap.title}</h1>
        </div>
        {progress && progress.total > 0 && <p className="text-lg"><Trans>{progress.done} of {progress.total} linked tickets done</Trans></p>}
        {updates.at(-1) && <HealthBadge health={updates.at(-1)!.health} />}
        <p className="text-sm text-muted-foreground"><Trans>Generated {when} by TrackLin.es</Trans></p>
      </section>

      <div className="grid grid-cols-2 gap-8 break-after-page">
        <Donut title={t`Items by status`} note={t`Late: past the target date and not done.`} data={[
          { key: 'done', label: t`Done`, value: count('done') },
          { key: 'in_progress', label: t`In progress`, value: count('in_progress') },
          { key: 'not_started', label: t`Not started`, value: count('not_started') },
          { key: 'late', label: t`Late`, value: count('late') },
        ]} />
        <section className="grid gap-2" aria-label={t`Health over time`}>
          <h2 className="font-semibold"><Trans>Health over time</Trans></h2>
          {updates.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No updates posted yet.</Trans></p> : (
            <ol className="grid gap-2" data-health-strip>
              {updates.map((u) => (
                <li key={u.id} className="flex items-center gap-3 text-sm">
                  <span className="w-16 tabular-nums text-muted-foreground">{short.format(new Date(u.published_at))}</span>
                  <HealthBadge health={u.health} />
                  {u.author && <span className="text-muted-foreground">{u.author}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {linked.length > 0 && (
        <section className="grid gap-2 break-inside-avoid" aria-label={t`Progress by item`}>
          <h2 className="font-semibold"><Trans>Progress by item</Trans></h2>
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <BarChart data={linked.map((i) => ({ item: i.title, done: i.progress!.done, total: i.progress!.total }))} margin={{ top: 8, left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="item" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} isAnimationActive={false} />
              <Bar dataKey="done" fill="var(--color-done)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
          <p className="text-sm text-muted-foreground"><Trans>Linked tickets done against all linked tickets, for each item that has any.</Trans></p>
        </section>
      )}

      {burnup.length > 1 && (
        <section className="grid gap-2 break-inside-avoid" aria-label={t`Burn-up`}>
          <h2 className="font-semibold"><Trans>Burn-up</Trans></h2>
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <LineChart data={burnup.map((w) => ({ week: short.format(new Date(w.week_start)), done: w.done, total: w.total }))} margin={{ top: 8, left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line dataKey="total" stroke="var(--color-total)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              <Line dataKey="done" stroke="var(--color-done)" strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
          <p className="text-sm text-muted-foreground"><Trans>Linked tickets done each week (the solid line) against all linked tickets (dashed): the gap is what's left.</Trans></p>
        </section>
      )}
    </div>
  );
}
