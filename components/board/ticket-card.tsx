'use client';

import { useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { personLabel } from '@/lib/people';
import { PriorityBadge } from './priority-badge';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { TicketLabels } from '@/components/ticket/labels';
import { TypeBadge } from '@/components/ticket-type';
import type { Ticket } from '@/lib/api';
import { TicketDialog } from './ticket-dialog';
import { TicketView } from './ticket-view';

type Props = {
  ticket: Ticket;
  token: string;
  onUpdated: (ticket: Ticket) => void;
  onDeleted: (id: string) => void;
  openOnLoad?: { columnName: string }; // deep link (/boards/<id>?ticket=<this>): start with the View modal open
  done?: boolean; // in the board's last column: attachments locked
};

export function TicketCard({ ticket, token, onUpdated, onDeleted, openOnLoad, done }: Props) {
  const [viewOpen, setViewOpen] = useState(Boolean(openOnLoad));
  const [editOpen, setEditOpen] = useState(false);
  const [columnName, setColumnName] = useState(openOnLoad?.columnName ?? '');

  function openView(event: MouseEvent<HTMLButtonElement>) {
    const label = event.currentTarget.closest<HTMLElement>('[data-column-id]')?.getAttribute('aria-label') ?? '';
    setColumnName(label.replace(/\s+column$/i, '') || 'Current column');
    setViewOpen(true);
  }

  return (
    <>
      <Card className="gap-2 py-3 shadow-xs">
        <div className="flex items-start gap-1 px-3">
          {/* the title opens the read-only view; the pencil edits */}
          <button type="button" onClick={openView} className="min-w-0 flex-1 rounded-sm text-left text-sm font-medium leading-5 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {ticket.title}
          </button>
          <Button type="button" variant="ghost" size="icon" className="-mt-1 -mr-1.5 size-7 shrink-0 text-muted-foreground" aria-label={`Edit ${ticket.title}`} onClick={() => setEditOpen(true)}>
            <PencilIcon className="size-3.5" aria-hidden />
          </Button>
        </div>
        {(ticket.blocked || (ticket.type && ticket.type !== 'task') || (ticket.priority && ticket.priority !== 'medium')) && (
          <div className="flex flex-wrap gap-1 px-3">
            {ticket.type && ticket.type !== 'task' && <TypeBadge type={ticket.type} />}
            <PriorityBadge priority={ticket.priority} hideDefault />
            {ticket.blocked && <BlockedBadge />}
          </div>
        )}
        <TicketLabels labels={ticket.labels} className="px-3" />
        {ticket.description && (
          <p className="line-clamp-2 px-3 text-xs whitespace-pre-line text-muted-foreground">{ticket.description}</p>
        )}
        <div className="flex items-center justify-between gap-2 px-3 text-xs text-muted-foreground">
          <span className="truncate">{ticket.assigned_to ? personLabel(ticket.assigned_to) : <span className="italic">Unassigned</span>}</span>
          <span className="truncate">by {personLabel(ticket.created_by)}</span>
        </div>
      </Card>
      <TicketView
        open={viewOpen}
        onOpenChange={setViewOpen}
        ticket={ticket}
        columnName={columnName}
        token={token}
        done={done}
        onEdit={() => { setViewOpen(false); setEditOpen(true); }}
      />
      <TicketDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        token={token}
        projectId={ticket.project_id}
        columnId={ticket.column_id}
        ticket={ticket}
        onSaved={onUpdated}
        onDeleted={onDeleted}
        onSentToBacklog={onDeleted}
        done={done}
      />
    </>
  );
}
