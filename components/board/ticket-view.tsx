'use client';

import { NeedsReviewBadge, ReviewActions } from './review';
import { Markdown } from '@/components/markdown';
import { When } from '@/components/when';
import { CopyLink } from '@/components/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { BugfixesPanel } from '@/components/ticket/bugfixes-panel';
import { PullRequestsPanel } from '@/components/ticket/pull-requests-panel';
import { TicketComments } from '@/components/ticket/comments';
import { TicketLabels } from '@/components/ticket/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Ticket } from '@/lib/api';
import { EstimateBadge } from './estimate';
import { TICKET_DIALOG_WIDTH } from './ticket-dialog';
import { personLabel } from '@/lib/people';
import { usePeople } from '@/lib/use-people';
import { TicketKey, ticketPath, linkTitle } from '@/components/ticket/ticket-key';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChecklistCount } from '@/components/ticket/checklist-count';
import { toggleTask } from '@/lib/checklist';

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
  const people = usePeople(token);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${TICKET_DIALOG_WIDTH}`} // same size as editing it
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="pr-8 flex flex-wrap items-center gap-2"><TicketKey value={ticket.key} copy />{ticket.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Status <Badge variant="secondary">{columnName}</Badge>
            {ticket.duplicate_of_key && <Badge variant="outline">Duplicate of {ticket.duplicate_of_key}</Badge>}
            <EstimateBadge estimate={ticket.estimate} />
            <NeedsReviewBadge ticket={ticket} />
          </DialogDescription>
        </DialogHeader>
        {ticket.duplicate_of_id && ticket.duplicate_of_title && <p className="text-sm text-muted-foreground">Original: <Link href={`/tickets/${ticket.duplicate_of_id}`} className="font-medium text-foreground hover:underline"><TicketKey value={ticket.duplicate_of_key} /> {ticket.duplicate_of_title}</Link></p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Created by</dt>
          <dd>{personLabel(ticket.created_by, people)}{ticket.created_at && <span className="text-muted-foreground">, <When iso={ticket.created_at} /></span>}</dd>
          {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
            <>
              <dt className="text-muted-foreground">Updated</dt>
              <dd><When iso={ticket.updated_at} /></dd>
            </>
          )}
          {ticket.done_at && (
            <>
              <dt className="text-muted-foreground">{ticket.resolution === 'duplicate' ? 'Duplicate' : 'Done'}</dt>
              <dd><When iso={ticket.done_at} /></dd>
            </>
          )}
          <dt className="text-muted-foreground">Assigned to</dt>
          <dd>{ticket.assigned_to ? personLabel(ticket.assigned_to, people) : <span className="text-muted-foreground italic">Unassigned</span>}</dd>
        </dl>
        {token && onReviewed && <ReviewActions ticket={ticket} token={token} onReviewed={onReviewed} />}
        <TicketLabels labels={ticket.labels} />
        <section aria-label="Ticket details" className="min-h-20 rounded-md bg-muted/50 p-3 text-sm">
          <ChecklistCount markdown={ticket.description} className="mb-2" />
          {ticket.description ? (
            <Markdown onToggleTask={onDescription && ((line) => onDescription(toggleTask(ticket.description, line)))}>{ticket.description}</Markdown>
          ) : (
            <p className="text-muted-foreground">No details provided.</p>
          )}
        </section>
        {open && token && <BugfixesPanel ticket={ticket} token={token} />}
        {open && token && <Attachments ticketId={ticket.id} token={token} locked={done} />}
        {open && token && <PullRequestsPanel ticketId={ticket.id} token={token} />}
        {open && token && <TicketComments ticketId={ticket.id} token={token} />}
        {sample}
        <DialogFooter>
          {!sample && <CopyLink path={ticketPath(ticket)} token={token} title={linkTitle(ticket)} className="sm:mr-auto" />}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {onEdit && <Button type="button" onClick={onEdit}>Edit</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
