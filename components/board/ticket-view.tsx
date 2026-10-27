'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { NeedsReviewBadge, ReviewActions } from './review';
import { DueBadge } from '@/components/ticket/due-badge';
import { Markdown } from '@/components/common/markdown';
import { When } from '@/components/common/when';
import { CopyLink } from '@/components/common/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { BugfixesPanel } from '@/components/ticket/bugfixes-panel';
import { PullRequestsPanel } from '@/components/ticket/pull-requests-panel';
import { TicketComments } from '@/components/ticket/comments';
import { TicketLabels } from '@/components/ticket/labels';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { tickets, type Ticket, type TicketDetail } from '@/lib/api';
import { EstimateBadge } from './estimate';
import { TICKET_DIALOG_WIDTH } from './ticket-dialog';
import { personLabel } from '@/lib/work/people';
import { awayText } from '@/lib/work/away';
import { usePeople } from '@/lib/hooks/use-people';
import { TicketKey, ticketPath, linkTitle } from '@/components/ticket/ticket-key';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { TicketRelations } from '@/components/ticket/relations';
import { ChecklistCount } from '@/components/ticket/checklist-count';
import { toggleTask } from '@/lib/ticket/checklist';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  columnName: string;
  onEdit?: () => void; // absent: view only (e.g. while the board is being edited)
  token?: string; // enables the Attachments section
  done?: boolean; // in the board's last column: attachments locked
  onReviewed?: () => void; // enables Approve / Send back on a ticket waiting for review
  sample?: ReactNode; // landing page: static stand-ins for the live sections; no copy link
  onDescription?: (next: string) => void; // checklist ticks save the details; absent: read-only
};

export function TicketView({ open, onOpenChange, ticket, columnName, onEdit, token, done, onReviewed, sample, onDescription }: Props) {
  const { t, i18n } = useLingui();
  const people = usePeople(token);
  // the board only knows "blocked": the parent and what blocks it come with the ticket itself (TL-639)
  const [detail, setDetail] = useState<Pick<TicketDetail, 'parent' | 'blocked_by' | 'blocks'> | null>(null);
  useEffect(() => {
    if (!open || !token || sample) return;
    let live = true;
    tickets.get(ticket.id, token).then((d) => { if (live) setDetail(d); }, () => {});
    return () => { live = false; };
  }, [open, ticket.id, token !== undefined]); // token refreshes must not refetch
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${TICKET_DIALOG_WIDTH}`} // same size as editing it
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="pr-8 flex flex-wrap items-center gap-2"><TicketKey value={ticket.key} copy />{ticket.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Trans>Status</Trans> <Badge variant="secondary">{columnName}</Badge>
            {ticket.duplicate_of_key && <Badge variant="outline"><Trans>Duplicate of {ticket.duplicate_of_key}</Trans></Badge>}
            <EstimateBadge estimate={ticket.estimate} />
            <DueBadge due={ticket.due_date} done={done || !!ticket.done_at} />
            <NeedsReviewBadge ticket={ticket} />
          </DialogDescription>
        </DialogHeader>
        {ticket.duplicate_of_id && ticket.duplicate_of_title && <p className="text-sm text-muted-foreground"><Trans>Original:</Trans> <Link href={`/tickets/${ticket.duplicate_of_id}`} className="font-medium text-foreground hover:underline"><TicketKey value={ticket.duplicate_of_key} /> {ticket.duplicate_of_title}</Link></p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground"><Trans>Created by</Trans></dt>
          <dd>{personLabel(i18n, ticket.created_by, people)}{ticket.created_at && <span className="text-muted-foreground">, <When iso={ticket.created_at} /></span>}</dd>
          {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
            <>
              <dt className="text-muted-foreground"><Trans>Updated</Trans></dt>
              <dd><When iso={ticket.updated_at} /></dd>
            </>
          )}
          {ticket.done_at && (
            <>
              <dt className="text-muted-foreground">{ticket.resolution === 'duplicate' ? t`Duplicate` : t`Done`}</dt>
              <dd><When iso={ticket.done_at} /></dd>
            </>
          )}
          <dt className="text-muted-foreground"><Trans>Assigned to</Trans></dt>
          <dd>{ticket.assigned_to ? <Assignee id={ticket.assigned_to} people={people} /> : <span className="text-muted-foreground italic"><Trans>Unassigned</Trans></span>}</dd>
        </dl>
        {detail && <TicketRelations parent={detail.parent} blockedBy={detail.blocked_by} blocks={detail.blocks} />}
        {token && onReviewed && <ReviewActions ticket={ticket} token={token} onReviewed={onReviewed} />}
        <TicketLabels labels={ticket.labels} />
        <section aria-label={t`Ticket details`} className="min-h-20 rounded-md bg-muted/50 p-3 text-sm">
          <ChecklistCount markdown={ticket.description} className="mb-2" />
          {ticket.description ? (
            <Markdown onToggleTask={onDescription && ((line) => onDescription(toggleTask(ticket.description, line)))}>{ticket.description}</Markdown>
          ) : (
            <p className="text-muted-foreground"><Trans>No details provided.</Trans></p>
          )}
        </section>
        {open && token && <BugfixesPanel ticket={ticket} token={token} />}
        {open && token && <Attachments ticketId={ticket.id} token={token} locked={done} />}
        {open && token && <PullRequestsPanel ticketId={ticket.id} token={token} />}
        {open && token && <TicketComments ticketId={ticket.id} token={token} />}
        {sample}
        <DialogFooter>
          {!sample && (
            <div className="flex flex-wrap gap-2 sm:mr-auto">
              <CopyLink path={ticketPath(ticket)} token={token} title={linkTitle(ticket)} />
              {/* history is on the full page only (TL-373): this opens it there, no copy and paste */}
              <Link href={`${ticketPath(ticket)}#history`} className={buttonVariants({ variant: 'ghost' })}><Trans>History</Trans></Link>
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><Trans>Close</Trans></Button>
          {onEdit && <Button type="button" onClick={onEdit}><Trans>Edit</Trans></Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Assignee: who has it, and whether they're on holiday, as the ticket page's picker says (TL-436).
export function Assignee({ id, people }: { id: string; people: Parameters<typeof personLabel>[2] }) {
  const { i18n } = useLingui();
  const away = awayText(people?.find((p) => p.id === id), i18n);
  return (
    <>
      {personLabel(i18n, id, people)}
      {away && <span className="text-amber-700 dark:text-amber-400"> · {away.charAt(0).toLowerCase()}{away.slice(1)}</span>}
    </>
  );
}
