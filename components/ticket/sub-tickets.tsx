'use client';

import Link from 'next/link';
import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { DepRow, projectTickets, type TicketOption } from '@/components/ticket/dependencies';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { ApiError, boards, tickets, type Child, type TicketDetail } from '@/lib/api';
import { epicSize } from '@/components/project/epics';

// subTicketSummary: "2 of 3 done" for a parent's progress line.
export function subTicketSummary(i18n: I18n, children: { done: boolean }[]): string {
  const done = children.filter((c) => c.done).length;
  const total = children.length;
  return i18n._(msg`${done} of ${total} done`);
}

// byBoard groups an epic's sub-tickets by where they are (TL-214): boards by name, then the backlog.
export function byBoard<C extends Child>(i18n: I18n, children: C[]): { board: string; children: C[] }[] {
  const groups = new Map<string, C[]>();
  for (const c of children) {
    const board = c.board_name ?? '';
    groups.set(board, [...(groups.get(board) ?? []), c]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([board, children]) => ({ board: board || i18n._(msg`Backlog`), children }));
}

// PartOf: "Part of <parent>" under a sub-ticket's title.
export function PartOf({ ticket }: { ticket: TicketDetail }) {
  if (!ticket.parent) return null;
  return (
    <p className="text-sm text-muted-foreground">
      <Trans>Part of <Link href={`/tickets/${ticket.parent.id}`} className="font-medium text-foreground hover:underline">{ticket.parent.title}</Link></Trans>
    </p>
  );
}

// SubTickets: this ticket's children (with progress), add an existing or brand-new ticket as a child, or detach one.
export function SubTickets({ ticket, token, onChanged }: { ticket: TicketDetail; token: string; onChanged: () => void }) {
  const { t, i18n } = useLingui();
  const children = ticket.children ?? [];
  const [options, setOptions] = useState<TicketOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newIn, setNewIn] = useState<string | null>(null); // column for a new sub-ticket ('' = backlog); null = dialog closed

  async function setParent(childId: string, parentId: string | null) {
    setSaving(true);
    setError('');
    try {
      await tickets.setParent(childId, parentId, token);
      onChanged();
    } catch (err) {
      // 400/409 explain it (e.g. that ticket is already above this one, or this one is done)
      setError(err instanceof ApiError && (err.status === 400 || err.status === 409) ? err.message : t`Couldn’t update sub-tickets. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  // a new sub-ticket starts where the work is planned: the parent's board's first column, or the backlog
  async function startNew() {
    setError('');
    try {
      setNewIn(ticket.board_id ? ((await boards.get(ticket.board_id, token)).columns?.[0]?.id ?? '') : '');
    } catch {
      setError(t`Couldn’t open the new ticket form. Please try again.`);
    }
  }

  const detach = (title: string) => t`Detach ${title}`;
  const choices = (options ?? []).filter((o) => o.id !== ticket.id && o.id !== ticket.parent?.id && !children.some((c) => c.id === o.id));

  return (
    <section aria-labelledby={`subs-${ticket.id}`} className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`subs-${ticket.id}`} className="text-sm font-semibold"><Trans>Sub-tickets</Trans></h2>
        {children.length > 0 && <span className="text-sm text-muted-foreground">{ticket.epic ? epicSize(ticket.epic, i18n) : subTicketSummary(i18n, children)}</span>}
      </div>
      {children.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ticket.done ? <Trans>None.</Trans> : ticket.type === 'epic' ? <Trans>None yet. Add the work this epic is made of; it can sit on any board.</Trans> : <Trans>None — split bigger work into sub-tickets here.</Trans>}</p>
      ) : ticket.type === 'epic' ? (
        // an epic's work spans boards: grouped by where each piece is
        <div className="grid gap-3">
          {byBoard(i18n, children).map((g) => (
            <div key={g.board} className="grid gap-1">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.board}</h3>
              <ul className="grid gap-1">
                {g.children.map((c) => <DepRow key={c.id} d={c} removeLabel={detach(c.title)} onRemove={saving ? undefined : () => setParent(c.id, null)} />)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-1">
          {children.map((c) => <DepRow key={c.id} d={c} removeLabel={detach(c.title)} onRemove={saving ? undefined : () => setParent(c.id, null)} />)}
        </ul>
      )}
      {/* a done ticket takes no new sub-tickets (TL-528) */}
      {!ticket.done && <div className="flex items-center gap-2">
        {options === null ? (
          <Button size="sm" variant="outline" disabled={saving} onClick={() => projectTickets(ticket.project_id, token).then(setOptions, () => setError(t`Couldn’t load the project’s tickets.`))}>
            <Trans>Add a sub-ticket…</Trans>
          </Button>
        ) : (
          <Select items={Object.fromEntries(choices.map((o) => [o.id, o.title]))} value={null} onValueChange={(v) => v && setParent(String(v), ticket.id)} disabled={saving}>
            <SelectTrigger size="sm" className="w-full max-w-md" aria-label={t`Choose a ticket to make a sub-ticket of this one`}>
              <SelectValue placeholder={choices.length ? t`Choose a ticket…` : t`No other tickets in this project`} />
            </SelectTrigger>
            <SelectContent>{choices.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Button size="sm" variant="outline" disabled={saving} onClick={startNew}><Trans>New sub-ticket…</Trans></Button>
      </div>}
      {newIn !== null && (
        <TicketDialog
          open
          onOpenChange={(o) => !o && setNewIn(null)}
          token={token}
          projectId={ticket.project_id}
          columnId={newIn}
          scale={newIn ? ticket.estimate_scale : 'none'} // on the parent's board: its scale (estimate required)
          epic={false} // an epic can't be inside another, and a new sub-ticket is work, not an epic
          onSaved={(created) => void setParent(created.id, ticket.id)}
        />
      )}
      {ticket.parent && (
        <Button size="sm" variant="ghost" className="justify-self-start text-muted-foreground" disabled={saving} onClick={() => setParent(ticket.id, null)}>
          <Trans>Detach from “{ticket.parent.title}”</Trans>
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
