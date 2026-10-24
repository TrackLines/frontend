'use client';

import Link from 'next/link';
import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TicketKey } from '@/components/ticket/ticket-key';
import { tickets, type EpicProgress, type EpicSummary } from '@/lib/api';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

// epicSize: "3 of 5 done · 13 points · 2 not sized" (TL-214).
export function epicSize(p: EpicProgress, i18n: I18n): string {
  if (p.total === 0) return i18n._(msg`No sub-tickets yet`);
  const { done, total, unestimated } = p;
  const parts = [i18n._(msg`${done} of ${total} done`)];
  if (p.points > 0) parts.push(i18n._(msg`${plural(Math.round(p.points * 10) / 10, { one: '# point', other: '# points' })}`));
  if (unestimated > 0) parts.push(i18n._(msg`${unestimated} not sized`));
  return parts.join(' · ');
}

const percent = (p: EpicProgress) => (p.total ? Math.round((p.done / p.total) * 100) : 0);

// Epics: a project's epics with progress and size (TL-214), between its boards and backlog. The tab
// stays mounted, so it reloads when opened and refreshes like the backlog: an epic made after the page
// loaded (e.g. by an agent) shows up. A failed first load says so, not "No epics yet".
export function Epics({ projectId, token, active = true }: { projectId: string; token: string; active?: boolean }) {
  const [list, setList] = useState<EpicSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => tickets.epics(projectId, token).then((l) => { setList(l); setFailed(false); }, () => setFailed(true));
  useEffect(() => { if (active) void load(); }, [projectId, active]); // token refreshes must not refetch
  useAutoRefresh(load, active);
  return <EpicsView epics={list} failed={failed} />;
}

// EpicsView: pure, for tests. Nothing until loaded; a hint when there are none; an error when the
// first load failed (a failed refresh keeps the list it has).
export function EpicsView({ epics, failed = false }: { epics: EpicSummary[] | null; failed?: boolean }) {
  const { t, i18n } = useLingui();
  if (epics === null) return failed ? <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load the epics. Please refresh to try again.</Trans></p> : null;
  return (
    <section id="epics">
      <div className="mb-4">
        {/* the Epics tab names it (TL-385) */}
        <p className="text-sm text-muted-foreground"><Trans>Large pieces of work across boards. Their sub-tickets go on the boards; the epic shows how far they&apos;ve got.</Trans></p>
      </div>
      {epics.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><Trans>No epics yet. Add one to the backlog with the Epic type, or make a big ticket an epic from its edit form.</Trans></p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {epics.map((e) => (
            <li key={e.id}>
              {/* grid-cols-1 (minmax(0,1fr)): a long title truncates instead of widening the card past its edge (TL-403) */}
              <Link href={`/tickets/${e.id}`} className="grid h-full grid-cols-1 gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/40">
                <span className="flex items-center gap-2">
                  <TicketKey value={e.key} />
                  <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                  {e.done && <Badge variant="secondary">{e.resolution === 'wont_do' ? t`Won’t do` : t`Done`}</Badge>}
                </span>
                <Progress value={percent(e.progress)} aria-label={t`${e.title}: ${percent(e.progress)}% done`} />
                <span className="text-xs text-muted-foreground">{epicSize(e.progress, i18n)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
