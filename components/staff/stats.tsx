'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import type { I18n } from '@lingui/core';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { staff, type StaffCount, type SystemStats } from '@/lib/api';
import { useToken } from '@/lib/use-token';

const TAGS: Record<string, string> = { en: 'en-GB', pt: 'pt-BR', tlh: 'en-GB' };
const number = (i18n: I18n, n: number) => new Intl.NumberFormat(TAGS[i18n.locale] ?? i18n.locale).format(n);

// size: bytes in the largest unit that keeps it above 1 (KB, MB, GB), one decimal.
export function size(i18n: I18n, b: number): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
  let i = 0;
  while (b >= 1000 && i < units.length - 1) { b /= 1000; i++; }
  return new Intl.NumberFormat(TAGS[i18n.locale] ?? i18n.locale, { style: 'unit', unit: units[i], unitDisplay: 'short', maximumFractionDigits: 1 }).format(b);
}

// StaffStats: the whole system in numbers (TL-578), from GET /api/staff/stats. Counts only.
export function StaffStats() {
  const token = useToken();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    if (!token) return;
    setFailed(false);
    staff.stats(token).then(setStats, () => setFailed(true));
  };
  useEffect(load, [token !== null]);
  return <StatsView stats={stats} failed={failed} onRetry={load} />;
}

export function StatsView({ stats, failed, onRetry }: { stats: SystemStats | null; failed: boolean; onRetry: () => void }) {
  const { t, i18n } = useLingui();
  if (failed) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        <span className="text-destructive"><Trans>Couldn’t load the stats.</Trans></span>
        <Button size="sm" variant="outline" onClick={onRetry}><Trans>Try again</Trans></Button>
      </div>
    );
  }
  if (!stats) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>;
  const n = (x: number) => number(i18n, x);
  const plans = stats.plans;
  const keys = Object.entries(stats.api_keys).sort(([a], [b]) => a.localeCompare(b));
  const keyTotal = keys.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-stats>
      <Tile title={t`Organizations`} count={stats.organizations} n={n}
        detail={t`Free ${n(plans.free ?? 0)} · Pro ${n(plans.pro ?? 0)} · Enterprise ${n(plans.enterprise ?? 0)}`} />
      <Tile title={t`Members`} count={stats.members} n={n} />
      <Tile title={t`Projects`} count={stats.projects} n={n} />
      <Tile title={t`Boards`} count={stats.boards} n={n} detail={t`${n(stats.archived_boards)} archived`} />
      <Tile title={t`Tickets`} count={stats.tickets} n={n} detail={t`${n(stats.done_tickets)} done · ${n(stats.tickets.total - stats.done_tickets)} open`} />
      <Tile title={t`Comments`} count={stats.comments} n={n} />
      <Tile title={t`Attachments`} count={stats.attachments} n={n} detail={t`${size(i18n, stats.attachment_bytes)} stored`} />
      <Tile title={t`API keys`} value={n(keyTotal)} detail={keys.length ? keys.map(([k, v]) => `${k} ${n(v)}`).join(' · ') : t`None yet`} />
      <Tile title={t`Right now`} value={t`${n(stats.open_sprints)} open sprints`} detail={t`${n(stats.live_sessions)} live sessions`} />
      <Tile title={t`Database`} value={size(i18n, stats.database_bytes)} />
    </div>
  );
}

function Tile({ title, count, value, detail, n }: { title: string; count?: StaffCount; value?: string; detail?: ReactNode; n?: (x: number) => string }) {
  return (
    <Card size="sm">
      <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-1">
        <p className="text-3xl font-semibold tabular-nums">{count && n ? n(count.total) : value}</p>
        {count && n && <p className="text-xs text-muted-foreground tabular-nums"><Trans>+{n(count.day)} in 24 hours · +{n(count.week)} in 7 days</Trans></p>}
        {detail && <p className="text-xs text-muted-foreground tabular-nums">{detail}</p>}
      </CardContent>
    </Card>
  );
}
