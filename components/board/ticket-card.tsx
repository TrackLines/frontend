'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Ticket } from '@/lib/api';
import { TicketDialog } from './ticket-dialog';

type Props = {
  ticket: Ticket;
  token: string;
  onUpdated: (ticket: Ticket) => void;
  onDeleted: (id: string) => void;
};

export function TicketCard({ ticket, token, onUpdated, onDeleted }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="gap-3 py-3 shadow-xs">
        <CardHeader className="px-3">
          <CardTitle className="text-sm leading-5">{ticket.title}</CardTitle>
        </CardHeader>
        {ticket.description && (
          <CardContent className="px-3 text-sm text-muted-foreground">
            <p className="line-clamp-3 whitespace-pre-line">{ticket.description}</p>
          </CardContent>
        )}
        <div className="px-3">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>Edit ticket</Button>
        </div>
      </Card>
      <TicketDialog
        open={open}
        onOpenChange={setOpen}
        token={token}
        columnId={ticket.column_id}
        ticket={ticket}
        onSaved={onUpdated}
        onDeleted={onDeleted}
      />
    </>
  );
}
