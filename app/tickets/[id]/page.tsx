'use client';

import { DueBadge } from '@/components/ticket/due-badge';
import { NeedsReviewBadge, ReviewActions } from '@/components/board/review';
import { Markdown } from '@/components/common/markdown';
import { When } from '@/components/common/when';
import Link from 'next/link';
import { Elsewhere } from '@/components/ticket/other-org';
import { LoadError } from '@/components/layout/load-error';
import { useParams, useRouter } from 'next/navigation';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CopyLink } from '@/components/common/copy-link';
import { Attachments } from '@/components/ticket/attachments';
import { BugfixesPanel } from '@/components/ticket/bugfixes-panel';
import { PullRequestsPanel } from '@/components/ticket/pull-requests-panel';
import { HistoryPanel } from '@/components/ticket/history-panel';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { AssigneeSelect } from '@/components/ticket/assignee-select';
import { ParentSection } from '@/components/ticket/sub-tickets';
import { TicketLinks } from '@/components/ticket/ticket-links';
import { DuplicateLinks, MarkDuplicate } from '@/components/ticket/duplicates';
import { TicketComments } from '@/components/ticket/comments';
import { LabelDrawer, TicketLabels } from '@/components/ticket/labels';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/board/priority-badge';
import { EstimateBadge } from '@/components/board/estimate';
import { TypeBadge } from '@/components/ticket/ticket-type';
import { PlannedBadge } from '@/components/ticket/planned-badge';
import { TimeboxCountdown } from '@/components/ticket/timebox-countdown';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ApiError, tickets, type Ticket, type TicketDetail } from '@/lib/api';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { personLabel } from '@/lib/work/people';
import { usePeople } from '@/lib/hooks/use-people';
import { useToken } from '@/lib/hooks/use-token';
import { useCachedState } from '@/lib/api/page-cache';
import { TicketSkeleton } from '@/components/layout/page-skeletons';
import { isTicketKey, TicketKey, ticketPath, linkTitle } from '@/components/ticket/ticket-key';
import { afterDelete, closedAs, ticketActions } from '@/lib/ticket/ticket-page';
import { ChecklistCount } from '@/components/ticket/checklist-count';
import { toggleTask } from '@/lib/ticket/checklist';

// A shareable page for one ticket — works for board and backlog tickets.
export default function TicketPage() {
  const { t, i18n } = useLingui();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useToken();
  const people = usePeople(token);
  const [tk, setT] = useCachedState<TicketDetail>(`ticket:${id}`); // last-seen ticket shows instantly, then refreshes
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
    if (tk) setLabels(tk.labels ?? []);
  }, [tk?.id, tk?.labels]);

  async function saveLabels() {
    if (!tk || !token) return;
    setSavingLabels(true);
    setLabelError('');
    try {
      const result = await tickets.setLabels(tk.id, labels, token);
      setLabels(result.labels);
      setT((current) => current && { ...current, labels: result.labels });
    } catch {
      setLabelError(t`Couldn’t save labels. Please try again.`);
    } finally {
      setSavingLabels(false);
    }
  }

  if (error && elsewhere) return <Elsewhere orgId={elsewhere} />;
  if (error) return <LoadError status={error} thing="ticket" />;
  if (!tk) return <TicketSkeleton />;
  const creator = personLabel(i18n, tk.created_by, people);
  const assignee = tk.assigned_to && personLabel(i18n, tk.assigned_to, people);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10">
      <nav aria-label={t`Breadcrumb`} className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
        <Link href={`/projects/${tk.project_id}`} className="hover:underline">{tk.project_name}</Link>
        <span aria-hidden>›</span>
        {tk.board_id ? (
          <>
            <Link href={`/boards/${tk.board_id}`} className="hover:underline">{tk.board_name}</Link>
            <span aria-hidden>›</span>
            <span>{tk.column_name}</span>
          </>
        ) : (
          <span><Trans>Backlog</Trans></span>
        )}
      </nav>
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={tk.type} />
          {tk.type === 'spike' && <TimeboxCountdown startedAt={tk.started_at} doneAt={tk.done_at} days={tk.timebox_days} hours={tk.timebox_hours} projectId={tk.project_id} />}
          <PriorityBadge priority={tk.priority} />
          <EstimateBadge estimate={tk.estimate} />
          {tk.sprint_number != null && <Badge variant="secondary"><Trans>Sprint {tk.sprint_number}</Trans></Badge>}
          <PlannedBadge ticket={tk} />
          {tk.blocked && <BlockedBadge href="#blocked-by" />}
          <DueBadge due={tk.due_date} done={tk.done} />
          <NeedsReviewBadge ticket={tk} />
          {tk.resolution === 'wont_do' && <Badge variant="outline" title={t`Closed as decided against`}><Trans>Won&apos;t do</Trans></Badge>}
          {tk.resolution === 'duplicate' && <Badge variant="outline"><Trans>Duplicate</Trans></Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={tk.duplicate_of_id ? 'line-through' : undefined}><TicketKey value={tk.key} copy /></span><h1 className={`text-3xl font-bold tracking-tight ${tk.duplicate_of_id ? 'line-through text-muted-foreground' : ''}`}>{tk.title}</h1>
          {/* board and backlog tickets alike: edit (and delete, inside the dialog) right here */}
          {token && <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setEditing(true)}><Trans>Edit</Trans></Button>}
        </div>
      <DuplicateLinks ticket={tk} />
        <p className="text-sm text-muted-foreground">
          {tk.created_at ? <Trans>Created by {creator} <When iso={tk.created_at} /></Trans> : <Trans>Created by {creator}</Trans>}
          {tk.updated_at && tk.updated_at !== tk.created_at && <> · <Trans>updated <When iso={tk.updated_at} /></Trans></>}
          {tk.done_at && <> · {closedAs(i18n, tk)} <When iso={tk.done_at} /></>}
          {!token && <> · {assignee ? <Trans>assigned to {assignee}</Trans> : <Trans>unassigned</Trans>}</>}
        </p>
        {!token && <TicketLabels labels={tk.labels} />}{/* signed in, the label editor below shows them */}
        {token && (
          <label className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="whitespace-nowrap leading-8"><Trans>Assigned to</Trans></span>
            <div className="w-72 max-w-full"><AssigneeSelect ticketId={tk.id} value={tk.assigned_to} token={token} onChange={(nt) => setT({ ...tk, assigned_to: nt.assigned_to })} /></div>
          </label>
        )}
      </header>
      {token && (
        <div className="grid gap-2" aria-label={t`Edit ticket labels`}>
          <LabelDrawer projectId={tk.project_id} token={token} labels={labels} onChange={setLabels} disabled={savingLabels} onSave={saveLabels} saveLabel={savingLabels ? t`Saving labels…` : t`Save labels`} />
          {labelError && <p role="alert" className="text-sm text-destructive">{labelError}</p>}
        </div>
      )}
      {token && <ReviewActions ticket={tk} token={token} onReviewed={() => { void tickets.get(tk.id, token).then(setT); }} />}
      <section aria-label={t`Ticket details`} className="rounded-xl border p-5 text-sm">
        <ChecklistCount markdown={tk.description} className="mb-3" />
        {tk.description ? <Markdown onToggleTask={token ? (line) => {
          const next = toggleTask(tk.description, line);
          setT({ ...tk, description: next }); // ticks show at once; put back if saving fails
          void tickets.update(tk.id, { title: tk.title, description: next }, token).catch(() => setT(tk));
        } : undefined}>{tk.description}</Markdown> : <p className="text-muted-foreground"><Trans>No details provided.</Trans></p>}
      </section>
      {/* where it belongs, only when it does; then its links, as tabs (TL-686) */}
      {token && <ParentSection ticket={tk} token={token} onChanged={() => tickets.get(id, token).then(setT)} />}
      {token && <TicketLinks ticket={tk} token={token} onChanged={() => tickets.get(id, token).then(setT)} />}
      {token && <MarkDuplicate ticket={tk} token={token} onChanged={() => { void tickets.get(tk.id, token).then(setT); }} />}
      {token && <BugfixesPanel ticket={tk} token={token} />}
      {token && <Attachments ticketId={tk.id} token={token} locked={tk.done} />}
      {token && <PullRequestsPanel ticketId={tk.id} token={token} />}
      {token && <TicketComments ticketId={tk.id} token={token} />}
      {/* last, below the conversation; full page only: the board's dialog and side view leave history out */}
      {token && <HistoryPanel ticketId={tk.id} token={token} people={people} ticket={tk} />}
      {token && (
        <TicketDialog
          open={editing}
          onOpenChange={setEditing}
          token={token}
          projectId={tk.project_id}
          columnId={tk.column_id ?? ''}
          ticket={tk as Ticket}
          scale={tk.estimate_scale}
          done={tk.done}
          onSaved={() => { void tickets.get(tk.id, token).then(setT); }}
          onDeleted={() => router.push(afterDelete(tk))}
          onSentToBacklog={ticketActions(tk).sendToBacklog ? () => { void tickets.get(tk.id, token).then(setT); } : undefined}
          onWontDo={ticketActions(tk).wontDo ? () => { void tickets.get(tk.id, token).then(setT); } : undefined}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {tk.board_id && (
          <>
            <Link href={`/boards/${tk.board_id}`} className={buttonVariants()}><Trans>Open board</Trans></Link>
            <Link href={`/boards/${tk.board_id}?ticket=${tk.id}`} className={buttonVariants({ variant: 'outline' })}><Trans>Open in board</Trans></Link>
          </>
        )}
        <Link href={`/projects/${tk.project_id}`} className={buttonVariants({ variant: 'outline' })}><Trans>Open project</Trans></Link>
        <CopyLink path={ticketPath(tk)} token={token} title={linkTitle(tk)} />
      </div>
    </main>
  );
}
