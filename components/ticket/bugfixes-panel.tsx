'use client';

import { BugIcon, ExternalLinkIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { When } from '@/components/when';
import { tickets, type Ticket, type TicketBugfixes } from '@/lib/api';

// BugfixesPanel shows the crash report behind a ticket Bugfixes made: how often it happened, when
// last, where, and whether it came back after the ticket was done. Other tickets render nothing.
export function BugfixesPanel({ ticket, token }: { ticket: Pick<Ticket, 'id' | 'external_source'>; token: string }) {
  const [data, setData] = useState<TicketBugfixes | null>(null);
  const [failed, setFailed] = useState(false);
  const fromBugfixes = ticket.external_source === 'bugfixes';
  useEffect(() => {
    if (fromBugfixes) tickets.bugfixes(ticket.id, token).then(setData, () => setFailed(true));
  }, [ticket.id, fromBugfixes]); // token refreshes must not refetch
  if (!fromBugfixes) return null;
  return <BugfixesPanelView data={data} failed={failed} />;
}

export function BugfixesPanelView({ data, failed = false }: { data: TicketBugfixes | null; failed?: boolean }) {
  const report = data?.report;
  return (
    <section aria-label="Bugfixes report" className="grid gap-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold"><BugIcon className="size-4" aria-hidden /> Bugfixes</h2>
        {data?.regressed && <Badge variant="destructive" title="Seen again after this ticket was done">Regressed</Badge>}
        {report && <Badge variant={report.status === 'open' ? 'secondary' : 'outline'}>{report.status}</Badge>}
        {data?.url && (
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium hover:underline">
            Open in Bugfixes <ExternalLinkIcon className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
      {failed ? (
        <p className="text-muted-foreground">Couldn&apos;t load the Bugfixes report.</p>
      ) : data === null ? (
        <Skeleton role="status" aria-label="Loading the Bugfixes report…" className="h-10 w-full" />
      ) : !report ? (
        <p className="text-muted-foreground">
          {data.reason === 'not_connected'
            ? 'Live details appear once an organization admin connects Bugfixes.'
            : 'Bugfixes can’t be reached right now, so the details aren’t shown.'}
        </p>
      ) : (
        <>
          {report.title && <p className="font-medium">{report.title}</p>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Occurrences</dt>
            <dd>{report.occurrences}</dd>
            {report.last_seen && (
              <>
                <dt className="text-muted-foreground">Last seen</dt>
                <dd><When iso={report.last_seen} /></dd>
              </>
            )}
            {report.levels.length > 0 && (
              <>
                <dt className="text-muted-foreground">Level</dt>
                <dd className="flex flex-wrap gap-1">{report.levels.map((l) => <Badge key={l} variant={l === 'panic' || l === 'error' ? 'destructive' : 'secondary'}>{l}</Badge>)}</dd>
              </>
            )}
            {report.file && (
              <>
                <dt className="text-muted-foreground">Where</dt>
                <dd className="font-mono text-xs break-all">{report.file}{report.line ? `:${report.line}` : ''}</dd>
              </>
            )}
          </dl>
        </>
      )}
    </section>
  );
}
