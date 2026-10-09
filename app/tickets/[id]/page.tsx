'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CopyLink } from '@/components/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { AssigneeSelect } from '@/components/ticket/assignee-select';
import { Dependencies } from '@/components/ticket/dependencies';
import { PartOf, SubTickets } from '@/components/ticket/sub-tickets';
import { TicketComments } from '@/components/ticket/comments';
import { LabelDrawer, TicketLabels } from '@/components/ticket/labels';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/board/priority-badge';
import { EstimateBadge } from '@/components/board/estimate';
import { TypeBadge } from '@/components/ticket-type';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ApiError, tickets, type TicketDetail } from '@/lib/api';
import { personLabel } from '@/lib/people';
import { useToken } from '@/lib/use-token';
import { useCachedState } from '@/lib/page-cache';
import { TicketSkeleton } from '@/components/page-skeletons';

// A shareable page for one ticket — works for board and backlog tickets.
export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [t, setT] = useCachedState<TicketDetail>(`ticket:${id}`); // last-seen ticket shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [savingLabels, setSavingLabels] = useState(false);
  const [labelError, setLabelError] = useState('');

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) tickets.get(id, token).then(setT, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch

  useEffect(() => {
    if (t) setLabels(t.labels ?? []);
  }, [t?.id, t?.labels]);

  async function saveLabels() {
    if (!t || !token) return;
    setSavingLabels(true);
    setLabelError('');
    try {
      const result = await tickets.setLabels(t.id, labels, token);
      setLabels(result.labels);
      setT((current) => current && { ...current, labels: result.labels });
    } catch {
      setLabelError('Couldn’t save labels. Please try again.');
    } finally {
      setSavingLabels(false);
    }
  }

  if (error === 404) return <Message title="Ticket not found" body="It may have been deleted, or it belongs to another organization." />;
  if (error) return <Message title="Couldn't load this ticket" body="Please refresh to try again." />;
  if (!t) return <TicketSkeleton />;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10">
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
          <EstimateBadge estimate={t.estimate} />
          {t.sprint_number != null && <Badge variant="secondary">Sprint {t.sprint_number}</Badge>}
          {t.blocked && <BlockedBadge />}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <PartOf ticket={t} />
        <p className="text-sm text-muted-foreground">
          Created by {personLabel(t.created_by)}{!token && (t.assigned_to ? ` · assigned to ${personLabel(t.assigned_to)}` : ' · unassigned')}
        </p>
        <TicketLabels labels={t.labels} />
        {token && (
          <label className="flex max-w-xs items-center gap-2 text-sm text-muted-foreground">
            Assigned to
            <AssigneeSelect ticketId={t.id} value={t.assigned_to} token={token} onChange={(nt) => setT({ ...t, assigned_to: nt.assigned_to })} />
          </label>
        )}
      </header>
      {token && (
        <div className="grid gap-2" aria-label="Edit ticket labels">
          <LabelDrawer projectId={t.project_id} token={token} labels={labels} onChange={setLabels} disabled={savingLabels} onSave={saveLabels} saveLabel={savingLabels ? 'Saving labels…' : 'Save labels'} />
          {labelError && <p role="alert" className="text-sm text-destructive">{labelError}</p>}
        </div>
      )}
      <section aria-label="Ticket details" className="rounded-xl border p-5 text-sm">
        {t.description ? <p className="whitespace-pre-wrap break-words">{t.description}</p> : <p className="text-muted-foreground">No details provided.</p>}
      </section>
      {token && <SubTickets ticket={t} token={token} onChanged={() => tickets.get(id, token).then(setT)} />}
      {token && <Dependencies ticket={t} token={token} onChanged={() => tickets.get(id, token).then(setT)} />}
      {token && <Attachments ticketId={t.id} token={token} locked={t.done} />}
      {token && <TicketComments ticketId={t.id} token={token} />}
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
