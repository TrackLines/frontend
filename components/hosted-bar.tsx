'use client';

import { useEffect, useState } from 'react';
import { CrownIcon } from 'lucide-react';
import { TicketView } from '@/components/board/ticket-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tickets, type Assignee, type HostedSession, type Ticket, type TicketDetail } from '@/lib/api';
import type { HostedRole } from '@/lib/hosted';
import { personLabel } from '@/lib/people';

// HostedBar: who's in a hosted refinement or standup (host marked) and what you can do: end or
// hand over as the host; stop following or follow, and leave, as a follower (pure, for tests).
export function HostedBar({ session, role, following, people, onFollow, onLeave, onEnd, onHandOver, noun }: {
  session: HostedSession; role: HostedRole; following: boolean; people: Assignee[] | null;
  onFollow: (following: boolean) => void; onLeave: () => void; onEnd?: () => void; onHandOver: (to: string) => void; noun: string;
}) {
  const others = session.people.filter((p) => p !== session.host);
  return (
    <section aria-label={`Who's in the ${noun}`} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <span className="font-medium">{role === 'host' ? `You're hosting the ${noun}` : `${personLabel(session.host, people)} is hosting`}</span>
      <span className="text-muted-foreground">· {session.people.length} here</span>
      <ul className="flex flex-wrap items-center gap-1" aria-label="Here now">
        <li><Badge variant="secondary" title="Host"><CrownIcon aria-hidden /> {personLabel(session.host, people)}</Badge></li>
        {others.map((p) => (
          <li key={p} className="flex items-center gap-0.5">
            <Badge variant="outline">{personLabel(p, people)}</Badge>
            {role === 'host' && <Button type="button" size="xs" variant="ghost" onClick={() => onHandOver(p)} aria-label={`Make ${personLabel(p, people)} the host`}>Make host</Button>}
          </li>
        ))}
      </ul>
      <span className="ml-auto flex gap-2">
        {role === 'follower' && (following
          ? <Button type="button" size="sm" variant="outline" onClick={() => onFollow(false)} title="Look around on your own; the host's tickets stop opening for you">Stop following</Button>
          : <Button type="button" size="sm" onClick={() => onFollow(true)}>Follow host</Button>)}
        {role === 'host' && onEnd && <Button type="button" size="sm" variant="outline" onClick={onEnd}>End {noun}</Button>}
        {role === 'follower' && <Button type="button" size="sm" variant="ghost" onClick={onLeave}>Leave</Button>}
      </span>
    </section>
  );
}

// FollowedTicket: the ticket the host has open, read-only on a follower's screen; it closes when the
// host closes theirs. known: the ticket if the page already has it (a board), else it's fetched.
export function FollowedTicket({ ticketId, token, known, onDismiss }: { ticketId: string | null; token: string; known?: Ticket & { column_name?: string | null }; onDismiss: () => void }) {
  const [ticket, setTicket] = useState<(Ticket & { column_name?: string | null }) | null>(known ?? null);
  useEffect(() => {
    if (!ticketId) { setTicket(null); return; }
    if (known?.id === ticketId) { setTicket(known); return; }
    let live = true;
    tickets.get(ticketId, token).then((t: TicketDetail) => { if (live) setTicket(t as unknown as Ticket & { column_name?: string | null }); }, () => {});
    return () => { live = false; };
  }, [ticketId, known?.id]);
  if (!ticketId || !ticket || ticket.id !== ticketId) return null;
  return <TicketView open onOpenChange={(o) => { if (!o) onDismiss(); }} ticket={ticket} columnName={ticket.column_name ?? 'Backlog'} />;
}
