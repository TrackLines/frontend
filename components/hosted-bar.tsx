'use client';

import { useEffect, useState } from 'react';
import { CrownIcon } from 'lucide-react';
import { TicketView } from '@/components/board/ticket-view';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { tickets, type Assignee, type HostedSession, type Ticket, type TicketDetail } from '@/lib/api';
import type { HostedRole } from '@/lib/hosted';
import { personLabel } from '@/lib/people';

type BarProps = {
  session: HostedSession; role: HostedRole; following: boolean; people: Assignee[] | null;
  onFollow: (following: boolean) => void; onLeave: () => void; onEnd?: () => void; onHandOver: (to: string) => void; noun: string;
};

// HostedBar: a small "who's hosting · N here" button for the page header; the people and controls open
// in a drawer, so the session doesn't take a row of the page.
export function HostedBar(props: BarProps) {
  const { session, role, people } = props;
  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <CrownIcon aria-hidden /> {role === 'host' ? 'You’re hosting' : `${personLabel(session.host, people)} is hosting`} · {session.people.length} here
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="px-0 pt-0">
          <DrawerTitle>{role === 'host' ? `You’re hosting the ${props.noun}` : `${personLabel(session.host, people)} is hosting the ${props.noun}`}</DrawerTitle>
          <DrawerDescription>{session.people.length} here</DrawerDescription>
        </DrawerHeader>
        <HostedPeople {...props} />
      </DrawerContent>
    </Drawer>
  );
}

// HostedPeople: the drawer's contents: who's here (host marked) and what you can do: end or hand over
// as the host; stop following or follow, and leave, as a follower (pure, for tests).
export function HostedPeople({ session, role, following, people, onFollow, onLeave, onEnd, onHandOver, noun }: BarProps) {
  const others = session.people.filter((p) => p !== session.host);
  return (
    <section aria-label={`Who's in the ${noun}`} className="grid gap-4 text-sm">
      <ul className="grid gap-2" aria-label="Here now">
        <li className="flex items-center gap-2"><CrownIcon className="size-4" aria-label="Host" /> {personLabel(session.host, people)}</li>
        {others.map((p) => (
          <li key={p} className="flex items-center justify-between gap-2">
            <span>{personLabel(p, people)}</span>
            {role === 'host' && <Button type="button" size="xs" variant="ghost" onClick={() => onHandOver(p)} aria-label={`Make ${personLabel(p, people)} the host`}>Make host</Button>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {role === 'follower' && (following
          ? <Button type="button" size="sm" variant="outline" onClick={() => onFollow(false)} title="Look around on your own; the host's tickets stop opening for you">Stop following</Button>
          : <Button type="button" size="sm" onClick={() => onFollow(true)}>Follow host</Button>)}
        {role === 'host' && onEnd && <Button type="button" size="sm" variant="outline" onClick={onEnd}>End {noun}</Button>}
        {role === 'follower' && <Button type="button" size="sm" variant="ghost" onClick={onLeave}>Leave</Button>}
      </div>
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
