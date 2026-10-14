'use client';

import { NeedsReviewBadge, ReviewActions } from '@/components/board/review';
import { Markdown } from '@/components/markdown';
import { When } from '@/components/when';
import Link from 'next/link';
import { Elsewhere } from '@/components/ticket/other-org';
import { LoadError } from '@/components/load-error';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CopyLink } from '@/components/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { BugfixesPanel } from '@/components/ticket/bugfixes-panel';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { AssigneeSelect } from '@/components/ticket/assignee-select';
import { Dependencies } from '@/components/ticket/dependencies';
import { PartOf, SubTickets } from '@/components/ticket/sub-tickets';
import { DuplicateLinks, MarkDuplicate } from '@/components/ticket/duplicates';
import { TicketComments } from '@/components/ticket/comments';
import { LabelDrawer, TicketLabels } from '@/components/ticket/labels';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/board/priority-badge';
import { EstimateBadge } from '@/components/board/estimate';
import { TypeBadge } from '@/components/ticket-type';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ApiError, tickets, type Ticket, type TicketDetail } from '@/lib/api';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { personLabel } from '@/lib/people';
import { usePeople } from '@/lib/use-people';
import { useToken } from '@/lib/use-token';
import { useCachedState } from '@/lib/page-cache';
import { TicketSkeleton } from '@/components/page-skeletons';
import { isTicketKey, TicketKey, ticketPath, linkTitle } from '@/components/ticket/ticket-key';
import { afterDelete, closedAs, ticketActions } from '@/lib/ticket-page';
import { ChecklistCount } from '@/components/ticket/checklist-count';
import { toggleTask } from '@/lib/checklist';

// A shareable page for one ticket — works for board and backlog tickets.
export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useToken();
  const people = usePeople(token);
  const [t, setT] = useCachedState<TicketDetail>(`ticket:${id}`); // last-seen ticket shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [elsewhere, setElsewhere] = useState<string | null>(null); // the org it's in, when not this one
  const [labels, setLabels] = useState<string[]>([]);
  const [savingLabels, setSavingLabels] = useState(false);
  const [labelError, setLabelError] = useState('');
  const [editing, setEditing] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) {
      const byKey = isTicketKey(id);
      (byKey ? tickets.getByKey(id, token) : tickets.get(id, token)).then((ticket) => {
        setT(ticket);
        if (byKey) router.replace(`/tickets/${ticket.id}`);
      }, (e) => {
        const status = e instanceof ApiError ? e.status : 500;
        setError(status);
        // not in this org: maybe in another of mine (an id link; keys are per org), TL-276
        if ((status === 404 || status === 403) && !byKey) tickets.org(id, token).then((r) => setElsewhere(r.org_id), () => {});
      });
    }
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

  if (error && elsewhere) return <Elsewhere orgId={elsewhere} />;
  if (error) return <LoadError status={error} thing="ticket" />;
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
          <NeedsReviewBadge ticket={t} />
          {t.resolution === 'wont_do' && <Badge variant="outline" title="Closed as decided against">Won&apos;t do</Badge>}
          {t.resolution === 'duplicate' && <Badge variant="outline">Duplicate</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={t.duplicate_of_id ? 'line-through' : undefined}><TicketKey value={t.key} copy /></span><h1 className={`text-3xl font-bold tracking-tight ${t.duplicate_of_id ? 'line-through text-muted-foreground' : ''}`}>{t.title}</h1>
          {/* board and backlog tickets alike: edit (and delete, inside the dialog) right here */}
          {token && <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setEditing(true)}>Edit</Button>}
        </div>
        <PartOf ticket={t} />
      <DuplicateLinks ticket={t} />
        <p className="text-sm text-muted-foreground">
          Created by {personLabel(t.created_by, people)}{t.created_at && <> <When iso={t.created_at} /></>}
          {t.updated_at && t.updated_at !== t.created_at && <> · updated <When iso={t.updated_at} /></>}
          {t.done_at && <> · {closedAs(t)} <When iso={t.done_at} /></>}
          {!token && (t.assigned_to ? ` · assigned to ${personLabel(t.assigned_to, people)}` : ' · unassigned')}
        </p>
        {!token && <TicketLabels labels={t.labels} />}{/* signed in, the label editor below shows them */}
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
      {token && <ReviewActions ticket={t} token={token} onReviewed={() => { void tickets.get(t.id, token).then(setT); }} />}
      <section aria-label="Ticket details" className="rounded-xl border p-5 text-sm">
        <ChecklistCount markdown={t.description} className="mb-3" />
        {t.description ? <Markdown onToggleTask={token ? (line) => {
          const next = toggleTask(t.description, line);
          setT({ ...t, description: next }); // ticks show at once; put back if saving fails
          void tickets.update(t.id, { title: t.title, description: next }, token).catch(() => setT(t));
        } : undefined}>{t.description}</Markdown> : <p className="text-muted-foreground">No details provided.</p>}
      </section>
      {token && <SubTickets ticket={t} token={token} onChanged={() => tickets.get(id, token).then(setT)} />}
      {token && <Dependencies ticket={t} token={token} onChanged={() => tickets.get(id, token).then(setT)} />}
      {token && <MarkDuplicate ticket={t} token={token} onChanged={() => { void tickets.get(t.id, token).then(setT); }} />}
      {token && <BugfixesPanel ticket={t} token={token} />}
      {token && <Attachments ticketId={t.id} token={token} locked={t.done} />}
      {token && <TicketComments ticketId={t.id} token={token} />}
      {token && (
        <TicketDialog
          open={editing}
          onOpenChange={setEditing}
          token={token}
          projectId={t.project_id}
          columnId={t.column_id ?? ''}
          ticket={t as Ticket}
          scale={t.estimate_scale}
          done={t.done}
          onSaved={() => { void tickets.get(t.id, token).then(setT); }}
          onDeleted={() => router.push(afterDelete(t))}
          onSentToBacklog={ticketActions(t).sendToBacklog ? () => { void tickets.get(t.id, token).then(setT); } : undefined}
          onWontDo={ticketActions(t).wontDo ? () => { void tickets.get(t.id, token).then(setT); } : undefined}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {t.board_id && (
          <>
            <Link href={`/boards/${t.board_id}`} className={buttonVariants()}>Open board</Link>
            <Link href={`/boards/${t.board_id}?ticket=${t.id}`} className={buttonVariants({ variant: 'outline' })}>Open in board</Link>
          </>
        )}
        <Link href={`/projects/${t.project_id}`} className={buttonVariants({ variant: 'outline' })}>Open project</Link>
        <CopyLink path={ticketPath(t)} token={token} title={linkTitle(t)} />
      </div>
    </main>
  );
}
