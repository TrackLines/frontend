'use client';

import { GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestDraftIcon, GitPullRequestIcon, type LucideIcon } from 'lucide-react';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { When } from '@/components/common/when';
import { tickets, type TicketPR } from '@/lib/api';

const STATES: Record<TicketPR['state'], { icon: LucideIcon; label: MessageDescriptor; className: string }> = {
  open: { icon: GitPullRequestIcon, label: msg`Open`, className: 'text-emerald-600 dark:text-emerald-400' },
  draft: { icon: GitPullRequestDraftIcon, label: msg`Draft`, className: 'text-muted-foreground' },
  merged: { icon: GitMergeIcon, label: msg`Merged`, className: 'text-violet-600 dark:text-violet-400' },
  closed: { icon: GitPullRequestClosedIcon, label: msg`Closed`, className: 'text-destructive' },
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
  const { i18n } = useLingui();
  if (prs.length === 0) return null;
  return (
    <section aria-label={i18n._(msg`Pull requests`)} className="grid gap-2 rounded-lg border p-3 text-sm">
      <h2 className="flex items-center gap-1.5 font-semibold"><GitPullRequestIcon className="size-4" aria-hidden /> <Trans>Pull requests</Trans></h2>
      <ul className="grid gap-2">
        {prs.map((pr) => {
          const s = STATES[pr.state] ?? STATES.open;
          return (
            <li key={`${pr.provider}:${pr.repo}#${pr.number}`} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <s.icon className={`size-4 shrink-0 ${s.className}`} aria-hidden />
              {pr.url ? (
                <a href={pr.url} target="_blank" rel="noopener noreferrer" className="min-w-0 font-medium hover:underline">
                  <span className="text-muted-foreground">{pr.repo}#{pr.number}</span> {pr.title}
                </a>
              ) : ( // the landing page's sample: nowhere to link
                <span className="min-w-0 font-medium"><span className="text-muted-foreground">{pr.repo}#{pr.number}</span> {pr.title}</span>
              )}
              <Badge variant={pr.state === 'open' ? 'secondary' : 'outline'}>{i18n._(s.label)}</Badge>
              {pr.released_in && <Badge variant="outline"><Trans>Released in {pr.released_in}</Trans></Badge>}
              <span className="text-xs text-muted-foreground">{pr.author}{pr.updated_at && <> · <When iso={pr.updated_at} /></>}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
