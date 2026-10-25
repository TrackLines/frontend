'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { Mouth, MouthOff } from 'lucide-react';
import { Pager } from '@/components/pager';
import { TicketKey } from '@/components/ticket/ticket-key';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { mentions, type Assignee, type Mention, type MentionStatus, type MentionsPage } from '@/lib/api';
import { actorName } from '@/lib/notifications';
import { usePeople } from '@/lib/use-people';

const PER_PAGE = 25;

// Mentions: every ticket that @mentions me, newest mention first, a page at a time; filtered to
// not done, done (and closed) or all (TL-590).
export function Mentions({ token }: { token: string }) {
  const { t } = useLingui();
  const people = usePeople(token);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<MentionStatus>('all');
  const [data, setData] = useState<MentionsPage | null | 'failed'>(null);
  const latest = useRef(0);
  useEffect(() => {
    const request = ++latest.current;
    mentions.page(token, page, PER_PAGE, status).then(
      (d) => { if (request === latest.current) setData(d); },
      () => { if (request === latest.current) setData('failed'); },
    );
  }, [page, status]); // token refreshes must not refetch

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup size="sm" variant="outline" aria-label={t`Show`} value={[status]} onValueChange={(v) => { if (v[0]) { setStatus(v[0] as MentionStatus); setPage(1); } }} className="w-fit">
          <ToggleGroupItem value="open"><Trans>Not done</Trans></ToggleGroupItem>
          <ToggleGroupItem value="done"><Trans>Done</Trans></ToggleGroupItem>
          <ToggleGroupItem value="all"><Trans>All</Trans></ToggleGroupItem>
        </ToggleGroup>
      </div>
      <MentionsView data={data} people={people ?? []} status={status} token={token} />
      {data && data !== 'failed' && (
        <Pager page={page} lastPage={Math.max(1, Math.ceil(data.total / PER_PAGE))} onPage={setPage} anchor="#mentions" />
      )}
    </div>
  );
}

// MentionsView: one page of mentions (pure, for tests).
export function MentionsView({ data, people, status, token }: { data: MentionsPage | null | 'failed'; people: Assignee[]; status: MentionStatus; token: string }) {
  const { i18n } = useLingui();
  if (data === 'failed') return <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load your mentions. Please try again.</Trans></p>;
  if (data === null) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading your mentions…</Trans></p>;
  if (data.mentions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        {status === 'open' ? <Trans>No open tickets mention you.</Trans> : status === 'done' ? <Trans>No done tickets mention you.</Trans> : <Trans>Nobody has mentioned you yet.</Trans>}
      </p>
    );
  }
  return (
    <ul id="mentions" className="divide-y rounded-xl border">
      {data.mentions.map((m) => (
        <li key={m.ticket_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
          <TicketKey value={m.key} />
          <Link href={`/tickets/${m.ticket_id}`} className={`min-w-0 flex-1 font-medium hover:underline ${m.done ? 'text-muted-foreground line-through' : ''}`}>{m.title}</Link>
          {m.done && <Badge variant="outline"><Trans>Done</Trans></Badge>}
          <span className="text-xs text-muted-foreground">{m.project_name}</span>
          <span className="text-xs text-muted-foreground">{actorName(i18n, m.actor, people)} · <When iso={m.mentioned_at} /></span>
          <WatchToggle mention={m} token={token} />
        </li>
      ))}
    </ul>
  );
}

// WatchToggle: a mention row's watch switch (TL-588). Always shown on the Mentions page; in the
// dashboard panel (hover) only when you hover over the row or tab to it, so the panel stays calm. A mouth while you watch the ticket (you hear its comments and moves); press it to mute and it's
// a closed mouth; press again to watch again, without mentioning yourself. Only on mention lists.
export function WatchToggle({ mention, token, hover = false }: { mention: Mention; token: string; hover?: boolean }) {
  const { t } = useLingui();
  const [muted, setMuted] = useState(mention.muted);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await (muted ? mentions.unmute : mentions.mute)(mention.ticket_id, token);
      setMuted(!muted);
    } catch {
      // ponytail: stays as it was, which shows it didn't take; add a toast if people miss that
    } finally {
      setBusy(false);
    }
  }
  const label = muted ? t`Watch again` : t`Stop watching`;
  return (
    <Button size="icon-xs" variant="ghost" aria-label={label} title={label} disabled={busy} onClick={toggle}
      className={hover ? 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100' : undefined}>
      {muted ? <MouthOff /> : <Mouth />}
    </Button>
  );
}
