'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { PriorityBadge } from '@/components/board/priority-badge';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mentions, tickets, type Assignee, type Mention, type TicketSearchResult } from '@/lib/api';
import { actorName } from '@/lib/notifications';

const SHOW = 5;

// DashboardWork: the dashboard's "Assigned to me" (open, newest change first) and "Mentions"
// (tickets whose comments @mention me, newest first), above the projects.
export function DashboardWork({ token }: { token: string }) {
  const [assigned, setAssigned] = useState<TicketSearchResult[] | null | 'failed'>(null);
  const [mentioned, setMentioned] = useState<Mention[] | null | 'failed'>(null);
  const [people, setPeople] = useState<Assignee[]>([]);
  useEffect(() => {
    tickets.search({ assignee: 'me', status: 'open', limit: SHOW }, token).then(setAssigned, () => setAssigned('failed'));
    mentions.list(token, SHOW).then(setMentioned, () => setMentioned('failed'));
    tickets.assignees(token).then(setPeople, () => {});
  }, []); // load once; token refreshes must not refetch
  return <DashboardWorkView assigned={assigned} mentioned={mentioned} people={people} />;
}

// DashboardWorkView: the two lists (pure, for tests).
export function DashboardWorkView({ assigned, mentioned, people }: {
  assigned: TicketSearchResult[] | null | 'failed'; mentioned: Mention[] | null | 'failed'; people: Assignee[];
}) {
  return (
    <div className="mb-10 grid gap-4 md:grid-cols-2">
      <Panel title="Assigned to me" more={{ href: '/my-work', label: 'All my work' }} items={assigned} empty="Nothing assigned to you right now.">
        {(t: TicketSearchResult) => (
          <Row key={t.id} href={ticketPath(t)} ticketKey={t.key} title={t.title}>
            <PriorityBadge priority={t.priority} hideDefault />
            {t.blocked && <BlockedBadge />}
            <Badge variant="secondary">{t.column_name ?? 'Backlog'}</Badge>
            <span className="truncate">{t.project_name}</span>
          </Row>
        )}
      </Panel>
      <Panel title="Mentions" items={mentioned} empty="Nobody has mentioned you yet.">
        {(m: Mention) => (
          <Row key={m.ticket_id} href={`/tickets/${m.key || m.ticket_id}`} ticketKey={m.key} title={m.title} done={m.done}>
            <span className="truncate">{actorName(m.actor, people)} · <When iso={m.mentioned_at} /></span>
            <span className="truncate">{m.project_name}</span>
          </Row>
        )}
      </Panel>
    </div>
  );
}

function Panel<I>({ title, more, items, empty, children }: {
  title: string; more?: { href: string; label: string }; items: I[] | null | 'failed'; empty: string; children: (item: I) => ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <section aria-label={title}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          {more && <Link href={more.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">{more.label}</Link>}
        </div>
        {items === 'failed' ? <p role="alert" className="px-4 py-6 text-sm text-destructive">Couldn&apos;t load this. Please refresh to try again.</p>
          : items === null ? <p role="status" className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          : items.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
          : <ul className="divide-y">{items.map(children)}</ul>}
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
