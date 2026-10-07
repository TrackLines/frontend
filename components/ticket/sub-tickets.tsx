'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DepRow, projectTickets, type TicketOption } from '@/components/ticket/dependencies';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, tickets, type TicketDetail } from '@/lib/api';

// subTicketSummary: "2 of 3 done" for a parent's progress line.
export function subTicketSummary(children: { done: boolean }[]): string {
  return `${children.filter((c) => c.done).length} of ${children.length} done`;
}

// PartOf: "Part of <parent>" under a sub-ticket's title.
export function PartOf({ ticket }: { ticket: TicketDetail }) {
  if (!ticket.parent) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Part of <Link href={`/tickets/${ticket.parent.id}`} className="font-medium text-foreground hover:underline">{ticket.parent.title}</Link>
    </p>
  );
}

// SubTickets: this ticket's children (with progress), add an existing ticket as a child, or detach one.
export function SubTickets({ ticket, token, onChanged }: { ticket: TicketDetail; token: string; onChanged: () => void }) {
  const children = ticket.children ?? [];
  const [options, setOptions] = useState<TicketOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function setParent(childId: string, parentId: string | null) {
    setSaving(true);
    setError('');
    try {
      await tickets.setParent(childId, parentId, token);
      onChanged();
    } catch (err) {
      // 400 explains it (e.g. that ticket is already above this one)
      setError(err instanceof ApiError && err.status === 400 ? err.message : 'Couldn’t update sub-tickets. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const choices = (options ?? []).filter((o) => o.id !== ticket.id && o.id !== ticket.parent?.id && !children.some((c) => c.id === o.id));

  return (
    <section aria-labelledby={`subs-${ticket.id}`} className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`subs-${ticket.id}`} className="text-sm font-semibold">Sub-tickets</h2>
        {children.length > 0 && <span className="text-sm text-muted-foreground">{subTicketSummary(children)}</span>}
      </div>
      {children.length === 0 ? (
        <p className="text-sm text-muted-foreground">None — split bigger work into sub-tickets here.</p>
      ) : (
        <ul className="grid gap-1">
          {children.map((c) => <DepRow key={c.id} d={c} removeLabel={`Detach ${c.title}`} onRemove={saving ? undefined : () => setParent(c.id, null)} />)}
        </ul>
      )}
      <div className="flex items-center gap-2">
        {options === null ? (
          <Button size="sm" variant="outline" disabled={saving} onClick={() => projectTickets(ticket.project_id, token).then(setOptions, () => setError('Couldn’t load the project’s tickets.'))}>
            Add a sub-ticket…
          </Button>
        ) : (
          <Select items={Object.fromEntries(choices.map((o) => [o.id, o.title]))} value={null} onValueChange={(v) => v && setParent(String(v), ticket.id)} disabled={saving}>
            <SelectTrigger size="sm" className="w-full max-w-md" aria-label="Choose a ticket to make a sub-ticket of this one">
              <SelectValue placeholder={choices.length ? 'Choose a ticket…' : 'No other tickets in this project'} />
            </SelectTrigger>
            <SelectContent>{choices.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
      {ticket.parent && (
        <Button size="sm" variant="ghost" className="justify-self-start text-muted-foreground" disabled={saving} onClick={() => setParent(ticket.id, null)}>
          Detach from “{ticket.parent.title}”
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
