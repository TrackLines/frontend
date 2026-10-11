'use client';

import { NeedsReviewBadge } from './review';
import { plainText } from '@/components/markdown';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
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
import { TicketKey } from '@/components/ticket/ticket-key';
import type { EstimateScale } from '@/lib/estimates';

type Props = {
  ticket: Ticket;
  token: string;
  onUpdated: (ticket: Ticket) => void;
  onDeleted: (id: string) => void;
  openOnLoad?: { columnName: string }; // deep link (/boards/<id>?ticket=<this>): start with the View modal open
  done?: boolean; // in the board's last column: attachments locked
  scale?: EstimateScale; // the board's estimate scale
  readOnly?: boolean; // the board is being edited: tickets can be viewed, not changed
  onReviewed?: () => void; // approved or sent back: it changed column, so the board reloads
};

export function TicketCard({ ticket, token, onUpdated, onDeleted, openOnLoad, done, scale, readOnly = false, onReviewed }: Props) {
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
      <Card className="w-full min-w-0 gap-2 py-3 shadow-xs">
        {/* TL-134 layout: key, type, priority, blocked; then estimate and pencil, on top; the title underneath */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3">
          {ticket.key && <TicketKey value={ticket.key} />}
          {ticket.type && ticket.type !== 'task' && <TypeBadge type={ticket.type} />}
          <PriorityBadge priority={ticket.priority} hideDefault />
          {ticket.blocked && <BlockedBadge />}
          <NeedsReviewBadge ticket={ticket} />
          {ticket.external_source === 'bugfixes' && <Badge variant="outline" title="Reported by Bugfixes">Bugfixes</Badge>}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {ticket.estimate && <Badge variant="outline" className="size-6 justify-center rounded-full p-0" title="Estimate" aria-label={`Estimate ${ticket.estimate}`}>{ticket.estimate}</Badge>}
            {!readOnly && <Button type="button" variant="ghost" size="icon" className="-mr-1.5 size-7 text-muted-foreground" aria-label={`Edit ${ticket.title}`} onClick={() => setEditOpen(true)}>
              <PencilIcon className="size-3.5" aria-hidden />
            </Button>}
          </span>
        </div>
        {/* the title opens the read-only view, the pencil edits */}
        <Button type="button" variant="link" onClick={openView} className="mx-3 h-auto min-w-0 justify-start p-0 text-left text-base leading-5 font-medium whitespace-normal text-foreground">
          {ticket.title}
        </Button>
        <TicketLabels labels={ticket.labels} className="px-3" max={2} />
        {ticket.description && (
          <p className="line-clamp-2 break-words px-3 text-sm whitespace-pre-line text-muted-foreground">{plainText(ticket.description)}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 px-3 pt-2 text-xs text-muted-foreground">
          <span className="truncate">{ticket.assigned_to ? personLabel(ticket.assigned_to) : <span className="italic">Unassigned</span>}</span>
          <span className="truncate">by {personLabel(ticket.created_by)}{ticket.created_at && <>, <When iso={ticket.created_at} /></>}</span>
        </div>
      </Card>
      <TicketView
        open={viewOpen}
        onOpenChange={setViewOpen}
        ticket={ticket}
        columnName={columnName}
        token={token}
        done={done}
        onEdit={readOnly ? undefined : () => { setViewOpen(false); setEditOpen(true); }}
        onReviewed={readOnly ? undefined : () => { setViewOpen(false); onReviewed?.(); }}
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
        scale={scale}
      />
    </>
  );
}
