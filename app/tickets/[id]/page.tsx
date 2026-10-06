'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CopyLink } from '@/components/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { PriorityBadge } from '@/components/board/priority-badge';
import { TypeBadge } from '@/components/ticket-type';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ApiError, tickets, type TicketDetail } from '@/lib/api';
import { personLabel } from '@/lib/people';
import { useToken } from '@/lib/use-token';

// A shareable page for one ticket — works for board and backlog tickets.
export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [t, setT] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<number | null>(null);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) tickets.get(id, token).then(setT, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch

  if (error === 404) return <Message title="Ticket not found" body="It may have been deleted, or it isn't yours." />;
  if (error) return <Message title="Couldn't load this ticket" body="Please refresh to try again." />;
  if (!t) return <p className="p-8 text-muted-foreground" role="status">Loading ticket…</p>;

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-6 py-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
        <Link href={`/projects/${t.project_id}`} className="hover:underline">{t.project_name}</Link>
        <span aria-hidden>›</span>
        {t.board_id ? (
          <>
            <Link href={`/boards/${t.board_id}`} className="hover:underline">{t.board_name}</Link>
            <span aria-hidden>›</span>
            <span>{t.column_name}</span>
          </>
        ) : (
          <span>Backlog</span>
        )}
      </nav>
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={t.type} />
          <PriorityBadge priority={t.priority} />
          {t.sprint_number != null && <Badge variant="secondary">Sprint {t.sprint_number}</Badge>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">
          Created by {personLabel(t.created_by)}{t.assigned_to ? ` · assigned to ${personLabel(t.assigned_to)}` : ' · unassigned'}
        </p>
      </header>
      <section aria-label="Ticket details" className="rounded-xl border p-5 text-sm">
        {t.description ? <p className="whitespace-pre-wrap break-words">{t.description}</p> : <p className="text-muted-foreground">No details provided.</p>}
      </section>
      {token && <Attachments ticketId={t.id} token={token} locked={t.done} />}
      <div className="flex flex-wrap gap-2">
        {t.board_id && (
          <>
            <Link href={`/boards/${t.board_id}`} className={buttonVariants()}>Open board</Link>
            <Link href={`/boards/${t.board_id}?ticket=${t.id}`} className={buttonVariants({ variant: 'outline' })}>Open in board</Link>
          </>
        )}
        <Link href={`/projects/${t.project_id}`} className={buttonVariants({ variant: 'outline' })}>Open project</Link>
        <CopyLink path={`/tickets/${t.id}`} />
      </div>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Back to projects</Link>
    </main>
  );
}
