'use client';

import { CopyLink } from '@/components/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { TicketComments } from '@/components/ticket/comments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Ticket } from '@/lib/api';
import { personLabel } from '@/lib/people';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  columnName: string;
  onEdit: () => void;
  token?: string; // enables the Attachments section
  done?: boolean; // in the board's last column: attachments locked
};

export function TicketView({ open, onOpenChange, ticket, columnName, onEdit, token, done }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="pr-8">{ticket.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Status <Badge variant="secondary">{columnName}</Badge>
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Created by</dt>
          <dd>{personLabel(ticket.created_by)}</dd>
          <dt className="text-muted-foreground">Assigned to</dt>
          <dd>{ticket.assigned_to ? personLabel(ticket.assigned_to) : <span className="text-muted-foreground italic">Unassigned</span>}</dd>
        </dl>
        <section aria-label="Ticket details" className="min-h-20 rounded-md bg-muted/50 p-3 text-sm">
          {ticket.description ? (
            <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
          ) : (
            <p className="text-muted-foreground">No details provided.</p>
          )}
        </section>
        {open && token && <Attachments ticketId={ticket.id} token={token} locked={done} />}
        {open && token && <TicketComments ticketId={ticket.id} token={token} />}
        <DialogFooter>
          <CopyLink path={`/tickets/${ticket.id}`} className="sm:mr-auto" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" onClick={onEdit}>Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
