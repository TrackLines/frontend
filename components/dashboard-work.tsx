'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { PriorityBadge } from '@/components/board/priority-badge';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeboxCountdown } from '@/components/timebox-countdown';
import { mentions, tickets, type Assignee, type Mention, type TicketSearchResult } from '@/lib/api';
import { actorName } from '@/lib/notifications';

const SHOW = 5;

// Load<I>: a list that's still loading (null), failed to load ('failed'), or arrived.
type Load<I> = I[] | null | 'failed';
const has = <I,>(l: Load<I>): l is I[] => Array.isArray(l) && l.length > 0;
const pending = <I,>(l: Load<I>): boolean => l === null || l === 'failed';

// DashboardWork: the dashboard's "My work" (Assigned to me, and Created by me once you've raised one)
// and "Mentions", above the projects. Empty sections aren't shown (TL-490).
export function DashboardWork({ token }: { token: string }) {
  const [assigned, setAssigned] = useState<Load<TicketSearchResult>>(null);
  const [created, setCreated] = useState<Load<TicketSearchResult>>(null);
  const [mentioned, setMentioned] = useState<Load<Mention>>(null);
  const [people, setPeople] = useState<Assignee[]>([]);
  useEffect(() => {
    tickets.search({ assignee: 'me', status: 'open', limit: SHOW }, token).then(setAssigned, () => setAssigned('failed'));
    tickets.search({ creator: 'me', status: 'open', limit: SHOW }, token).then(setCreated, () => setCreated('failed'));
    mentions.list(token, SHOW).then(setMentioned, () => setMentioned('failed'));
    tickets.assignees(token).then(setPeople, () => {});
  }, []); // load once; token refreshes must not refetch
  return <DashboardWorkView assigned={assigned} created={created} mentioned={mentioned} people={people} />;
}

// DashboardWorkView: the cards (pure, for tests). The "My work" card is hidden once nothing is
// assigned and nothing was created by me; "Mentions" is hidden once nobody has mentioned me.
export function DashboardWorkView({ assigned, created, mentioned, people }: {
  assigned: Load<TicketSearchResult>; created: Load<TicketSearchResult>; mentioned: Load<Mention>; people: Assignee[];
}) {
  const ticketRow = (t: TicketSearchResult) => (
    <Row key={t.id} href={ticketPath(t)} ticketKey={t.key} title={t.title}>
      <PriorityBadge priority={t.priority} hideDefault />
      {t.blocked && <BlockedBadge />}
      {t.type === 'spike' && <TimeboxCountdown startedAt={t.started_at} doneAt={t.done_at} days={t.timebox_days} hours={t.timebox_hours} />}
      <Badge variant="secondary">{t.column_name ?? 'Backlog'}</Badge>
      <span className="truncate">{t.project_name}</span>
    </Row>
  );

  // the Created tab appears only once you've raised a ticket; keep the card while anything is still
  // loading so it doesn't flash in and out
  const showCreated = has(created);
  const showMyWork = pending(assigned) || pending(created) || has(assigned) || showCreated;
  const myWork = !showMyWork ? null : showCreated ? (
    <Card className="gap-0 py-0">
      <Tabs defaultValue="assigned" className="gap-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <TabsList>
            <TabsTrigger value="assigned">Assigned to me</TabsTrigger>
            <TabsTrigger value="created">Created by me</TabsTrigger>
          </TabsList>
          <Link href="/my-work" className="text-sm text-muted-foreground hover:text-foreground hover:underline">All my work</Link>
        </div>
        <TabsContent value="assigned" keepMounted><Items items={assigned} empty="Nothing assigned to you right now.">{ticketRow}</Items></TabsContent>
        <TabsContent value="created" keepMounted><Items items={created} empty="You haven’t created any tickets.">{ticketRow}</Items></TabsContent>
      </Tabs>
    </Card>
  ) : (
    <Panel title="Assigned to me" more={{ href: '/my-work', label: 'All my work' }} items={assigned} empty="Nothing assigned to you right now.">{ticketRow}</Panel>
  );

  const mentionsPanel = !(pending(mentioned) || has(mentioned)) ? null : (
    <Panel title="Mentions" more={{ href: '/mentions', label: 'All mentions' }} items={mentioned} empty="Nobody has mentioned you yet.">
      {(m: Mention) => (
        <Row key={m.ticket_id} href={`/tickets/${m.ticket_id}`} ticketKey={m.key} title={m.title} done={m.done}>
          <span className="truncate">{actorName(m.actor, people)} · <When iso={m.mentioned_at} /></span>
          <span className="truncate">{m.project_name}</span>
        </Row>
      )}
    </Panel>
  );

  if (!myWork && !mentionsPanel) return null;
  return <div className="mb-10 grid gap-4 md:grid-cols-2">{myWork}{mentionsPanel}</div>;
}

// Items: the body of a list — its loading, failed, empty and populated states.
function Items<I>({ items, empty, children }: { items: Load<I>; empty: string; children: (item: I) => ReactNode }) {
  if (items === 'failed') return <p role="alert" className="px-4 py-6 text-sm text-destructive">Couldn&apos;t load this. Please refresh to try again.</p>;
  if (items === null) return <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>;
  if (items.length === 0) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  return <ul className="divide-y">{items.map(children)}</ul>;
}

function Panel<I>({ title, more, items, empty, children }: {
  title: string; more?: { href: string; label: string }; items: Load<I>; empty: string; children: (item: I) => ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <section aria-label={title}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          {more && <Link href={more.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">{more.label}</Link>}
        </div>
        <Items items={items} empty={empty}>{children}</Items>
      </section>
    </Card>
  );
}

function Row({ href, ticketKey, title, done = false, children }: { href: string; ticketKey?: string; title: string; done?: boolean; children: ReactNode }) {
  return (
    <li className="grid gap-1 px-4 py-2.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <TicketKey value={ticketKey} />
        <Link href={href} className={`min-w-0 flex-1 truncate font-medium hover:underline ${done ? 'text-muted-foreground line-through' : ''}`}>{title}</Link>
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{children}</span>
    </li>
  );
}
