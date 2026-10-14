'use client';

import { GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestDraftIcon, GitPullRequestIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { When } from '@/components/when';
import { tickets, type TicketPR } from '@/lib/api';

const STATES: Record<TicketPR['state'], { icon: LucideIcon; label: string; className: string }> = {
  open: { icon: GitPullRequestIcon, label: 'Open', className: 'text-emerald-600 dark:text-emerald-400' },
  draft: { icon: GitPullRequestDraftIcon, label: 'Draft', className: 'text-muted-foreground' },
  merged: { icon: GitMergeIcon, label: 'Merged', className: 'text-violet-600 dark:text-violet-400' },
  closed: { icon: GitPullRequestClosedIcon, label: 'Closed', className: 'text-destructive' },
};

// PullRequestsPanel: the pull requests that mention this ticket (TL-283), like the Bugfixes panel:
// nothing until there are some. Merging one closes the ticket.
export function PullRequestsPanel({ ticketId, token }: { ticketId: string; token: string }) {
  const [prs, setPRs] = useState<TicketPR[]>([]);
  useEffect(() => {
    tickets.prs(ticketId, token).then(setPRs, () => setPRs([])); // no panel rather than an error: it's extra detail
  }, [ticketId]); // token refreshes must not refetch
  return <PullRequestsPanelView prs={prs} />;
}

// PullRequestsPanelView: the list (pure, for tests).
export function PullRequestsPanelView({ prs }: { prs: TicketPR[] }) {
  if (prs.length === 0) return null;
  return (
    <section aria-label="Pull requests" className="grid gap-2 rounded-lg border p-3 text-sm">
      <h2 className="flex items-center gap-1.5 font-semibold"><GitPullRequestIcon className="size-4" aria-hidden /> Pull requests</h2>
      <ul className="grid gap-2">
        {prs.map((pr) => {
          const s = STATES[pr.state] ?? STATES.open;
          return (
            <li key={`${pr.provider}:${pr.repo}#${pr.number}`} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <s.icon className={`size-4 shrink-0 ${s.className}`} aria-hidden />
              <a href={pr.url} target="_blank" rel="noopener noreferrer" className="min-w-0 font-medium hover:underline">
                <span className="text-muted-foreground">{pr.repo}#{pr.number}</span> {pr.title}
              </a>
              <Badge variant={pr.state === 'open' ? 'secondary' : 'outline'}>{s.label}</Badge>
              <span className="text-xs text-muted-foreground">{pr.author}{pr.updated_at && <> · <When iso={pr.updated_at} /></>}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
