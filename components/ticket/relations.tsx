'use client';

import { Trans } from '@lingui/react/macro';
import Link from 'next/link';
import type { Dep } from '@/lib/api';
import { DepRow } from './dependencies';

// TicketRelations: what a ticket belongs to and what it waits on (TL-639), read-only, for places that
// show a ticket without the full page's editors (the board's ticket view). Nothing when it has none.
// here: the ticket's project, so tickets in other projects read "Project - Title" (TL-715).
export function TicketRelations({ parent, blockedBy, blocks, here }: { parent?: Dep | null; blockedBy: Dep[]; blocks: Dep[]; here?: string }) {
  if (!parent && blockedBy.length === 0 && blocks.length === 0) return null;
  const waiting = blockedBy.filter((d) => !d.done).length;
  return (
    <section className="grid gap-2 text-sm" data-relations>
      {parent && (
        <p className="text-muted-foreground">
          <Trans>Part of <Link href={`/tickets/${parent.id}`} className="font-medium text-foreground hover:underline">{parent.title}</Link></Trans>
        </p>
      )}
      {blockedBy.length > 0 && (
        <div className="grid gap-1">
          <p className={`text-xs font-medium uppercase ${waiting > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {waiting > 0 ? <Trans>Blocked by</Trans> : <Trans>Was waiting on (all done)</Trans>}
          </p>
          <ul className="grid gap-1">{blockedBy.map((d) => <DepRow key={d.id} d={d} here={here} />)}</ul>
        </div>
      )}
      {blocks.length > 0 && (
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase text-muted-foreground"><Trans>Blocks</Trans></p>
          <ul className="grid gap-1">{blocks.map((d) => <DepRow key={d.id} d={d} here={here} />)}</ul>
        </div>
      )}
    </section>
  );
}
