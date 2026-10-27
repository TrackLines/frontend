'use client';

import Link from 'next/link';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type ReactNode } from 'react';
import { DueBadge } from '@/components/ticket/due-badge';
import { PriorityBadge } from '@/components/board/priority-badge';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { When } from '@/components/common/when';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeboxCountdown } from '@/components/ticket/timebox-countdown';
import { PlannedBadge } from '@/components/ticket/planned-badge';
import { WatchToggle } from '@/components/work/mentions';
import { mentions, tickets, type Assignee, type Mention, type TicketSearchResult } from '@/lib/api';
import { actorName } from '@/lib/work/notifications';

export const SHOW = 5;
// Created by me shows one fewer: its "5 of 9 tickets · See all" footer then takes the fifth row's
// place, so the card doesn't grow when the footer appears (TL-572)
export const SHOW_CREATED = SHOW - 1;

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
  const [totals, setTotals] = useState<Totals>({});
  useEffect(() => {
    tickets.searchPage({ assignee: 'me', status: 'open', limit: SHOW }, token)
      .then((r) => { setAssigned(r.tickets); setTotals((t) => ({ ...t, assigned: r.total })); }, () => setAssigned('failed'));
    tickets.searchPage({ creator: 'me', status: 'open', limit: SHOW_CREATED }, token)
      .then((r) => { setCreated(r.tickets); setTotals((t) => ({ ...t, created: r.total })); }, () => setCreated('failed'));
    mentions.list(token, SHOW, 'open').then(setMentioned, () => setMentioned('failed')); // done ones are on /mentions (TL-590)
    tickets.assignees(token).then(setPeople, () => {});
  }, []); // load once; token refreshes must not refetch
  return <DashboardWorkView assigned={assigned} created={created} mentioned={mentioned} people={people} totals={totals} token={token} />;
}

// Totals: how many open tickets each My work tab has in all, when it shows only some (TL-548)
type Totals = { assigned?: number; created?: number };

// DashboardWorkView: the cards (pure, for tests). The "My work" card is hidden once nothing is
// assigned and nothing was created by me; "Mentions" is hidden once nobody has mentioned me.
export function DashboardWorkView({ assigned, created, mentioned, people, totals = {}, token = '' }: {
  assigned: Load<TicketSearchResult>; created: Load<TicketSearchResult>; mentioned: Load<Mention>; people: Assignee[]; totals?: Totals; token?: string;
}) {
  const { t, i18n } = useLingui();
  const ticketRow = (tk: TicketSearchResult) => (
    <Row key={tk.id} href={ticketPath(tk)} ticketKey={tk.key} title={tk.title}>
      <PriorityBadge priority={tk.priority} hideDefault />
      {tk.blocked && <BlockedBadge />}
      <DueBadge due={tk.due_date} done={tk.done} />
      {tk.type === 'spike' && <TimeboxCountdown startedAt={tk.started_at} doneAt={tk.done_at} days={tk.timebox_days} hours={tk.timebox_hours} />}
      <Badge variant="secondary">{tk.column_name ?? t`Backlog`}</Badge>
      <PlannedBadge ticket={tk} />
      <span className="truncate">{tk.project_name}</span>
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
            <TabsTrigger value="assigned"><Trans>Assigned to me</Trans></TabsTrigger>
            <TabsTrigger value="created"><Trans>Created by me</Trans></TabsTrigger>
          </TabsList>
          <Link href="/my-work" className="text-sm text-muted-foreground hover:text-foreground hover:underline"><Trans>All my work</Trans></Link>
        </div>
        <TabsContent value="assigned" keepMounted>
          <Items items={assigned} empty={t`Nothing assigned to you right now.`}>{ticketRow}</Items>
          <More items={assigned} total={totals.assigned} href="/my-work" />
        </TabsContent>
        <TabsContent value="created" keepMounted>
          <Items items={created} empty={t`You haven’t created any tickets.`}>{ticketRow}</Items>
          <More items={created} total={totals.created} href="/my-work?tab=created" />
        </TabsContent>
      </Tabs>
    </Card>
  ) : (
    <Panel title={t`Assigned to me`} more={{ href: '/my-work', label: t`All my work` }} items={assigned} empty={t`Nothing assigned to you right now.`}
      footer={<More items={assigned} total={totals.assigned} href="/my-work" />}>{ticketRow}</Panel>
  );

  const mentionRow = (m: Mention) => (
    <Row key={m.ticket_id} href={`/tickets/${m.ticket_id}`} ticketKey={m.key} title={m.title} done={m.done} action={<WatchToggle mention={m} token={token} hover />}>
      <span className="truncate">{actorName(i18n, m.actor, people)} · <When iso={m.mentioned_at} /></span>
      <span className="truncate">{m.project_name}</span>
    </Row>
  );
  const showMentions = pending(mentioned) || has(mentioned);
  const mentionsPanel = !showMentions ? null : (
    <Panel title={t`Mentions`} more={{ href: '/mentions', label: t`All mentions` }} items={mentioned} empty={t`Nobody has mentioned you yet.`}>{mentionRow}</Panel>
  );

  if (!myWork && !mentionsPanel) return null;
  const tabs = [
    showMyWork && { value: 'assigned', label: t`Assigned`, more: { href: '/my-work', label: t`All my work` },
      body: <><Items items={assigned} empty={t`Nothing assigned to you right now.`}>{ticketRow}</Items><More items={assigned} total={totals.assigned} href="/my-work" /></> },
    showCreated && { value: 'created', label: t`Created`, more: { href: '/my-work?tab=created', label: t`All my work` },
      body: <><Items items={created} empty={t`You haven’t created any tickets.`}>{ticketRow}</Items><More items={created} total={totals.created} href="/my-work?tab=created" /></> },
    showMentions && { value: 'mentions', label: t`Mentions`, more: { href: '/mentions', label: t`All mentions` },
      body: <Items items={mentioned} empty={t`Nobody has mentioned you yet.`}>{mentionRow}</Items> },
  ].filter((x) => !!x);
  return (
    <>
      {/* phones (TL-694): one tabbed panel instead of two cards stacked above the projects */}
      <div className="mb-8 md:hidden" data-mobile-work>
        <MobileWork tabs={tabs} />
      </div>
      <div className="mb-10 hidden gap-4 md:grid md:grid-cols-2">{myWork}{mentionsPanel}</div>
    </>
  );
}

type WorkTab = { value: string; label: string; more: { href: string; label: string }; body: ReactNode };

// MobileWork: My work and Mentions as tabs of one card; the link at the top follows the tab.
function MobileWork({ tabs }: { tabs: WorkTab[] }) {
  const [tab, setTab] = useState(tabs[0]?.value ?? 'assigned');
  const current = tabs.find((x) => x.value === tab) ?? tabs[0];
  if (!current) return null;
  return (
    <Card className="gap-0 py-0">
      <Tabs value={current.value} onValueChange={(v) => setTab(String(v))} className="gap-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
          <TabsList>
            {tabs.map((x) => <TabsTrigger key={x.value} value={x.value}>{x.label}</TabsTrigger>)}
          </TabsList>
          <Link href={current.more.href} className="shrink-0 text-sm text-muted-foreground hover:text-foreground hover:underline">{current.more.label}</Link>
        </div>
        {tabs.map((x) => <TabsContent key={x.value} value={x.value}>{x.body}</TabsContent>)}
      </Tabs>
    </Card>
  );
}

// Items: the body of a list — its loading, failed, empty and populated states.
function Items<I>({ items, empty, children }: { items: Load<I>; empty: string; children: (item: I) => ReactNode }) {
  if (items === 'failed') return <p role="alert" className="px-4 py-6 text-sm text-destructive"><Trans>Couldn’t load this. Please refresh to try again.</Trans></p>;
  if (items === null) return <p role="status" className="px-4 py-6 text-sm text-muted-foreground"><Trans>Loading…</Trans></p>;
  if (items.length === 0) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  return <ul className="divide-y">{items.map(children)}</ul>;
}

// More: "5 of 9 tickets · See all" under a list that shows only part of what there is.
function More<I>({ items, total, href }: { items: Load<I>; total?: number; href: string }) {
  if (!Array.isArray(items) || total === undefined || total <= items.length) return null;
  const shown = items.length;
  return (
    <p className="border-t px-4 py-2.5 text-sm text-muted-foreground">
      <Trans>{shown} of <Plural value={total} one="# ticket" other="# tickets" /> · <Link href={href} className="hover:text-foreground hover:underline">See all</Link></Trans>
    </p>
  );
}

function Panel<I>({ title, more, items, empty, footer, children }: {
  title: string; more?: { href: string; label: string }; items: Load<I>; empty: string; footer?: ReactNode; children: (item: I) => ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <section aria-label={title}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          {more && <Link href={more.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">{more.label}</Link>}
        </div>
        <Items items={items} empty={empty}>{children}</Items>
        {footer}
      </section>
    </Card>
  );
}

function Row({ href, ticketKey, title, done = false, action, children }: { href: string; ticketKey?: string; title: string; done?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <li className="group grid gap-1 px-4 py-2.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <TicketKey value={ticketKey} />
        <Link href={href} className={`min-w-0 flex-1 truncate font-medium hover:underline ${done ? 'text-muted-foreground line-through' : ''}`}>{title}</Link>
        {action}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{children}</span>
    </li>
  );
}
