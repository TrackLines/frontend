'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TicketDetail } from '@/lib/api';
import { BlockedBy, Blocks } from './dependencies';
import { SubTickets } from './sub-tickets';

export type LinkTab = 'subs' | 'blocked-by' | 'blocks';

// firstTab: where a ticket's links open — its sub-tickets when it has any (or is an epic), else what
// blocks it, else what it blocks; the "blocked" badge's #blocked-by link always opens Blocked by.
export function firstTab(ticket: Pick<TicketDetail, 'type' | 'children' | 'blocked_by' | 'blocks'>, hash = ''): LinkTab {
  if (hash === '#blocked-by') return 'blocked-by';
  if ((ticket.children ?? []).length > 0 || ticket.type === 'epic') return 'subs';
  if (ticket.blocked_by.length > 0) return 'blocked-by';
  if (ticket.blocks.length > 0) return 'blocks';
  return 'subs';
}

// TicketLinks: a ticket's sub-tickets, what blocks it and what it blocks, as tabs on the full page (TL-686).
export function TicketLinks({ ticket, token, onChanged }: { ticket: TicketDetail; token: string; onChanged: () => void }) {
  const { t } = useLingui();
  const [tab, setTab] = useState<LinkTab>(() => firstTab(ticket, typeof window === 'undefined' ? '' : window.location.hash));
  // the badge links here while the page is open: follow it to its tab
  useEffect(() => {
    const follow = () => { if (window.location.hash === '#blocked-by') setTab('blocked-by'); };
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);
  const subs = (ticket.children ?? []).length;
  return (
    <section id="blocked-by" aria-labelledby={`links-${ticket.id}`} className="grid scroll-mt-20 gap-3">
      <h2 id={`links-${ticket.id}`} className="text-sm font-semibold"><Trans>Ticket links</Trans></h2>
      <Tabs value={tab} onValueChange={(v) => setTab(v as LinkTab)}>
        <TabsList aria-label={t`Ticket links`}>
          <TabsTrigger value="subs"><Trans>Sub-tickets ({subs})</Trans></TabsTrigger>
          <TabsTrigger value="blocked-by"><Trans>Blocked by ({ticket.blocked_by.length})</Trans></TabsTrigger>
          <TabsTrigger value="blocks"><Trans>Blocks ({ticket.blocks.length})</Trans></TabsTrigger>
        </TabsList>
        <TabsContent value="subs" className="pt-3"><SubTickets ticket={ticket} token={token} onChanged={onChanged} /></TabsContent>
        <TabsContent value="blocked-by" className="pt-3"><BlockedBy ticket={ticket} token={token} onChanged={onChanged} /></TabsContent>
        <TabsContent value="blocks" className="pt-3"><Blocks ticket={ticket} /></TabsContent>
      </Tabs>
    </section>
  );
}
