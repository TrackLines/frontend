'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Pager } from '@/components/pager';
import { TicketKey } from '@/components/ticket/ticket-key';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mentions, type Assignee, type MentionsPage } from '@/lib/api';
import { actorName } from '@/lib/notifications';
import { usePeople } from '@/lib/use-people';

const PER_PAGE = 25;

// Mentions: every ticket that @mentions me, newest mention first, a page at a time; done and
// closed tickets can be hidden.
export function Mentions({ token }: { token: string }) {
  const people = usePeople(token);
  const [page, setPage] = useState(1);
  const [hideDone, setHideDone] = useState(false);
  const [data, setData] = useState<MentionsPage | null | 'failed'>(null);
  const latest = useRef(0);
  useEffect(() => {
    const request = ++latest.current;
    mentions.page(token, page, PER_PAGE, hideDone).then(
      (d) => { if (request === latest.current) setData(d); },
      () => { if (request === latest.current) setData('failed'); },
    );
  }, [page, hideDone]); // token refreshes must not refetch

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={hideDone ? 'secondary' : 'ghost'} aria-pressed={hideDone} onClick={() => { setHideDone((h) => !h); setPage(1); }}>
          Hide done
        </Button>
      </div>
      <MentionsView data={data} people={people ?? []} hideDone={hideDone} />
      {data && data !== 'failed' && (
        <Pager page={page} lastPage={Math.max(1, Math.ceil(data.total / PER_PAGE))} onPage={setPage} anchor="#mentions" />
      )}
    </div>
  );
}

// MentionsView: one page of mentions (pure, for tests).
export function MentionsView({ data, people, hideDone }: { data: MentionsPage | null | 'failed'; people: Assignee[]; hideDone: boolean }) {
  if (data === 'failed') return <p role="alert" className="text-sm text-destructive">Couldn&apos;t load your mentions. Please try again.</p>;
  if (data === null) return <p role="status" className="text-sm text-muted-foreground">Loading your mentions…</p>;
  if (data.mentions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        {hideDone ? 'No open tickets mention you.' : 'Nobody has mentioned you yet.'}
      </p>
    );
  }
  return (
    <ul id="mentions" className="divide-y rounded-xl border">
      {data.mentions.map((m) => (
        <li key={m.ticket_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
          <TicketKey value={m.key} />
          <Link href={`/tickets/${m.ticket_id}`} className={`min-w-0 flex-1 font-medium hover:underline ${m.done ? 'text-muted-foreground line-through' : ''}`}>{m.title}</Link>
          {m.done && <Badge variant="outline">Done</Badge>}
          <span className="text-xs text-muted-foreground">{m.project_name}</span>
          <span className="text-xs text-muted-foreground">{actorName(m.actor, people)} · <When iso={m.mentioned_at} /></span>
        </li>
      ))}
    </ul>
  );
}
