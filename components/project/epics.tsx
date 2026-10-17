'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TicketKey } from '@/components/ticket/ticket-key';
import { tickets, type EpicProgress, type EpicSummary } from '@/lib/api';

// epicSize: "3 of 5 done · 13 points · 2 not sized" (TL-214).
export function epicSize(p: EpicProgress): string {
  if (p.total === 0) return 'No sub-tickets yet';
  const parts = [`${p.done} of ${p.total} done`];
  if (p.points > 0) parts.push(`${Math.round(p.points * 10) / 10} point${p.points === 1 ? '' : 's'}`);
  if (p.unestimated > 0) parts.push(`${p.unestimated} not sized`);
  return parts.join(' · ');
}

const percent = (p: EpicProgress) => (p.total ? Math.round((p.done / p.total) * 100) : 0);

// Epics: a project's epics with progress and size (TL-214), between its boards and backlog.
export function Epics({ projectId, token }: { projectId: string; token: string }) {
  const [list, setList] = useState<EpicSummary[] | null>(null);
  useEffect(() => { tickets.epics(projectId, token).then(setList, () => setList([])); }, [projectId]); // token refreshes must not refetch
  return <EpicsView epics={list} />;
}

// EpicsView: pure, for tests. Nothing until loaded; a hint when there are none.
export function EpicsView({ epics }: { epics: EpicSummary[] | null }) {
  if (epics === null) return null;
  return (
    <section id="epics">
      <div className="mb-4">
        {/* the Epics tab names it (TL-385) */}
        <p className="text-sm text-muted-foreground">Large pieces of work across boards. Their sub-tickets go on the boards; the epic shows how far they&apos;ve got.</p>
      </div>
      {epics.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No epics yet. Add one to the backlog with the Epic type, or make a big ticket an epic from its edit form.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {epics.map((e) => (
            <li key={e.id}>
              {/* grid-cols-1 (minmax(0,1fr)): a long title truncates instead of widening the card past its edge (TL-403) */}
              <Link href={`/tickets/${e.id}`} className="grid h-full grid-cols-1 gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/40">
                <span className="flex items-center gap-2">
                  <TicketKey value={e.key} />
                  <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                  {e.done && <Badge variant="secondary">{e.resolution === 'wont_do' ? 'Won’t do' : 'Done'}</Badge>}
                </span>
                <Progress value={percent(e.progress)} aria-label={`${e.title}: ${percent(e.progress)}% done`} />
                <span className="text-xs text-muted-foreground">{epicSize(e.progress)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
