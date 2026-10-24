'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CrownIcon } from 'lucide-react';
import { TicketView } from '@/components/board/ticket-view';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tickets, type Assignee, type HostedSession, type Ticket, type TicketDetail } from '@/lib/api';
import type { HostedRole } from '@/lib/hosted';
import { personLabel } from '@/lib/people';

type BarProps = {
  session: HostedSession; role: HostedRole; following: boolean; people: Assignee[] | null;
  onFollow: (following: boolean) => void; onLeave: () => void; onEnd?: () => void; onHandOver: (to: string) => void; noun: 'standup' | 'refinement';
};

// HostedBar: a small "who's hosting · N here" button for the page header; the people and controls open
// in a drawer, so the session doesn't take a row of the page.
export function HostedBar(props: BarProps) {
  const { session, role, people } = props;
  const { t, i18n } = useLingui();
  const host = personLabel(i18n, session.host, people);
  const here = session.people.length;
  const standup = props.noun === 'standup';
  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <CrownIcon aria-hidden /> {role === 'host' ? t`You’re hosting · ${here} here` : t`${host} is hosting · ${here} here`}
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="px-0 pt-0">
          <DrawerTitle>{role === 'host'
            ? (standup ? t`You’re hosting the standup` : t`You’re hosting the refinement`)
            : (standup ? t`${host} is hosting the standup` : t`${host} is hosting the refinement`)}</DrawerTitle>
          <DrawerDescription><Trans>{here} here</Trans></DrawerDescription>
        </DrawerHeader>
        <HostedPeople {...props} />
        <DrawerFooter className="px-0 pb-0">
          <HostedActions {...props} />
          <DrawerClose render={<Button type="button" variant="ghost" />}><Trans>Close</Trans></DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// HostedPeople: the drawer's body: the host, then everyone following, each with their avatar; the host
// can hand over to anyone here (pure, for tests).
export function HostedPeople({ session, role, people, onHandOver, noun }: BarProps) {
  const { t, i18n } = useLingui();
  const others = session.people.filter((p) => p !== session.host);
  const standup = noun === 'standup';
  const following = others.length;
  return (
    <section aria-label={standup ? t`Who's in the standup` : t`Who's in the refinement`} className="grid gap-5 text-sm">
      <div className="grid gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Trans>Host</Trans></h3>
        <ul aria-label={t`Host`}><PersonRow id={session.host} people={people} detail={standup ? t`Running the standup` : t`Running the refinement`} badge /></ul>
      </div>
      <div className="grid gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Trans>Following ({following})</Trans></h3>
        {others.length === 0
          ? <p className="text-muted-foreground"><Trans>Nobody else has joined yet.</Trans></p>
          : <ul aria-label={t`Following`} className="divide-y rounded-lg border">
              {others.map((p) => {
                const name = personLabel(i18n, p, people);
                return <PersonRow key={p} id={p} people={people} detail={t`Following`}
                  action={role === 'host' && <Button type="button" size="xs" variant="outline" onClick={() => onHandOver(p)} aria-label={t`Make ${name} the host`}><Trans>Make host</Trans></Button>} />;
              })}
            </ul>}
      </div>
    </section>
  );
}

// PersonRow: avatar (their picture, else initials), name with "You" for the viewer, and a detail line.
function PersonRow({ id, people, detail, badge = false, action }: { id: string; people: Assignee[] | null; detail: string; badge?: boolean; action?: React.ReactNode }) {
  const { i18n } = useLingui();
  const person = people?.find((p) => p.id === id);
  const label = personLabel(i18n, id, people);
  const you = person?.label === 'You';
  const name = you ? person?.name || label : label;
  return (
    <li className={`flex items-center gap-3 ${badge ? '' : 'px-3 py-2'}`}>
      <Avatar>
        {person?.image_url && <AvatarImage src={person.image_url} alt="" />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}{you && name !== label && <span className="font-normal text-muted-foreground"> <Trans>(you)</Trans></span>}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {badge && <Badge variant="secondary"><CrownIcon aria-hidden /> <Trans>Host</Trans></Badge>}
      {action}
    </li>
  );
}

// initials: "Max Hooton" → "MH", "other@develbox.info" → "O".
export function initials(name: string): string {
  const words = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0]?.[0] ?? '?')).toUpperCase();
}

// HostedActions: the drawer footer's actions: End for the host; Stop following / Follow host and
// Leave for a follower (pure, for tests). Ending or leaving removes the drawer with the session.
export function HostedActions({ role, following, onFollow, onLeave, onEnd, noun }: BarProps) {
  const { t } = useLingui();
  const standup = noun === 'standup';
  if (role === 'host') return onEnd ? <Button type="button" variant="destructive" onClick={onEnd}>{standup ? t`End standup` : t`End refinement`}</Button> : null;
  if (role !== 'follower') return null;
  return (
    <>
      {following
        ? <Button type="button" variant="outline" onClick={() => onFollow(false)} title={t`Look around on your own; the host's tickets stop opening for you`}><Trans>Stop following</Trans></Button>
        : <Button type="button" onClick={() => onFollow(true)}><Trans>Follow host</Trans></Button>}
      <Button type="button" variant="outline" onClick={onLeave}>{standup ? t`Leave standup` : t`Leave refinement`}</Button>
    </>
  );
}

// FollowedTicket: the ticket the host has open, read-only on a follower's screen; it closes when the
// host closes theirs. known: the ticket if the page already has it (a board), else it's fetched.
export function FollowedTicket({ ticketId, token, known, onDismiss }: { ticketId: string | null; token: string; known?: Ticket & { column_name?: string | null }; onDismiss: () => void }) {
  const { t } = useLingui();
  const [ticket, setTicket] = useState<(Ticket & { column_name?: string | null }) | null>(known ?? null);
  useEffect(() => {
    if (!ticketId) { setTicket(null); return; }
    if (known?.id === ticketId) { setTicket(known); return; }
    let live = true;
    tickets.get(ticketId, token).then((tk: TicketDetail) => { if (live) setTicket(tk as unknown as Ticket & { column_name?: string | null }); }, () => {});
    return () => { live = false; };
  }, [ticketId, known?.id]);
  if (!ticketId || !ticket || ticket.id !== ticketId) return null;
  return <TicketView open onOpenChange={(o) => { if (!o) onDismiss(); }} ticket={ticket} columnName={ticket.column_name ?? t`Backlog`} />;
}
