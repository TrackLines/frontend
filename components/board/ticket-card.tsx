'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { NeedsReviewBadge } from './review';
import { plainText } from '@/components/markdown';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { personLabel } from '@/lib/people';
import { usePeople } from '@/lib/use-people';
import { PriorityBadge } from './priority-badge';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { TicketLabels } from '@/components/ticket/labels';
import { TypeBadge, TimeboxBadge } from '@/components/ticket-type';
import { tickets, type Ticket, type Board } from '@/lib/api';
import { ChecklistCount } from '@/components/ticket/checklist-count';
import { TicketDialog } from './ticket-dialog';
import { TicketView } from './ticket-view';
import Link from 'next/link';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
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
  onViewChange?: (open: boolean) => void; // its read-only view opened or closed (a standup host shares it)
  move?: { boards: Board[]; onMoved: (id: string, planned: boolean) => void }; // Move to board: the project's other boards (TL-381)
};

export function TicketCard({ ticket, token, onUpdated, onDeleted, openOnLoad, done, scale, readOnly = false, onReviewed, onViewChange, move }: Props) {
  const { t, i18n } = useLingui();
  const [viewOpen, setViewOpenState] = useState(Boolean(openOnLoad));
  const setViewOpen = (open: boolean) => { setViewOpenState(open); onViewChange?.(open); };
  const [editOpen, setEditOpen] = useState(false);
  const [columnName, setColumnName] = useState(openOnLoad?.columnName ?? '');
  const people = usePeople(token);

  function openView(event: MouseEvent<HTMLButtonElement>) {
    setColumnName(event.currentTarget.closest<HTMLElement>('[data-column-id]')?.dataset.columnName || t`Current column`);
    setViewOpen(true);
  }

  return (
    <>
      <Card className="w-full min-w-0 gap-2 py-3 shadow-xs">
        {/* TL-134 layout: key, type, priority, blocked; then estimate and pencil, on top; the title underneath */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3">
          {/* the key opens the full ticket page (TL-517); the title below opens the modal */}
          {ticket.key && <Link href={ticketPath(ticket)} title={t`Open the full ticket`} className={`hover:underline ${ticket.duplicate_of_id ? 'line-through' : ''}`}><TicketKey value={ticket.key} /></Link>}
          {ticket.duplicate_of_key && <Badge variant="outline" title={t`Marked as a duplicate`}><Trans>Duplicate of {ticket.duplicate_of_key}</Trans></Badge>}
          {ticket.type && ticket.type !== 'task' && <TypeBadge type={ticket.type} />}
          {ticket.type === 'spike' && <TimeboxBadge days={ticket.timebox_days} hours={ticket.timebox_hours} />}
          <PriorityBadge priority={ticket.priority} hideDefault />
          {ticket.blocked && <BlockedBadge />}
          <NeedsReviewBadge ticket={ticket} />
          {ticket.external_source === 'bugfixes' && <Badge variant="outline" title={t`Reported by Bugfixes`}>Bugfixes</Badge>}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {ticket.estimate && <Badge variant="outline" className="size-6 justify-center rounded-full p-0" title={t`Estimate`} aria-label={t`Estimate ${ticket.estimate}`}>{ticket.estimate}</Badge>}
            {!readOnly && <Button type="button" variant="ghost" size="icon" className="-mr-1.5 size-7 text-muted-foreground" aria-label={t`Edit ${ticket.title}`} onClick={() => setEditOpen(true)}>
              <PencilIcon className="size-3.5" aria-hidden />
            </Button>}
          </span>
        </div>
        {/* the title opens the read-only view, the pencil edits */}
        <Button type="button" variant="link" onClick={openView} className={`mx-3 h-auto min-w-0 justify-start p-0 text-left text-base leading-5 font-medium whitespace-normal text-foreground ${ticket.duplicate_of_id ? 'line-through text-muted-foreground' : ''}`}>
          {ticket.title}
        </Button>
        <TicketLabels labels={ticket.labels} className="px-3" max={2} />
        <ChecklistCount markdown={ticket.description} className="px-3" />
        {ticket.description && (
          <p className="line-clamp-2 break-words px-3 text-sm whitespace-pre-line text-muted-foreground">{plainText(ticket.description)}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 px-3 pt-2 text-xs text-muted-foreground">
          <span className="truncate">{ticket.assigned_to ? personLabel(i18n, ticket.assigned_to, people) : <span className="italic"><Trans>Unassigned</Trans></span>}</span>
          <span className="truncate"><Trans>by {personLabel(i18n, ticket.created_by, people)}</Trans>{ticket.created_at && <>, <When iso={ticket.created_at} /></>}</span>
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
        onDescription={readOnly ? undefined : (next) => {
          onUpdated({ ...ticket, description: next }); // ticks show at once; put back if saving fails
          void tickets.update(ticket.id, { title: ticket.title, description: next }, token).catch(() => onUpdated(ticket));
        }}
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
        move={readOnly ? undefined : move}
      />
    </>
  );
}
