'use client';

import Link from 'next/link';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { TypeBadge } from '@/components/ticket/ticket-type';
import { When } from '@/components/common/when';
import { Markdown } from '@/components/common/markdown';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, intake, type IntakeSubmission } from '@/lib/api';

type Status = IntakeSubmission['status'];
const EMPTY: Record<Status, MessageDescriptor> = {
  pending: msg`No requests waiting. Share the request form link from Edit project to start collecting them.`,
  promoted: msg`Nothing added to the backlog from requests yet.`,
  dismissed: msg`Nothing dismissed.`,
};

// Triage: requests sent through the project's public form. Each pending one is added to the backlog
// (as an unassigned ticket) or dismissed.
export function Triage({ projectId, token }: { projectId: string; token: string }) {
  const { t } = useLingui();
  const [status, setStatus] = useState<Status>('pending');
  const [items, setItems] = useState<IntakeSubmission[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<IntakeSubmission | null>(null);

  useEffect(() => {
    setItems(null);
    setError('');
    intake.submissions(projectId, token, status).then(setItems, (err) =>
      setError(err instanceof ApiError && err.status === 404 ? t`You don’t have access to this project’s requests.` : t`Couldn’t load requests. Please try again.`));
  }, [projectId, status]); // token refreshes must not refetch

  async function decide(s: IntakeSubmission, promote: boolean) {
    const title = s.title;
    const ok = promote
      ? confirm(s.type === 'bug' ? t`Add “${title}” to the backlog as an unassigned bug?` : t`Add “${title}” to the backlog as an unassigned feature?`)
      : confirm(t`Dismiss “${title}”? It won't become a ticket.`);
    if (!ok) return;
    setBusy(s.id);
    setError('');
    try {
      if (promote) setAdded(await intake.promote(s.id, token));
      else await intake.dismiss(s.id, token);
      setItems((list) => list?.filter((x) => x.id !== s.id) ?? list);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t`Someone has already dealt with that request.` : t`Couldn’t save that. Please try again.`);
      if (err instanceof ApiError && err.status === 409) setItems((list) => list?.filter((x) => x.id !== s.id) ?? list);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Tabs value={status} onValueChange={(v) => { setAdded(null); setStatus(v as Status); }}>
        <TabsList>
          <TabsTrigger value="pending"><Trans>Waiting</Trans></TabsTrigger>
          <TabsTrigger value="promoted"><Trans>Added</Trans></TabsTrigger>
          <TabsTrigger value="dismissed"><Trans>Dismissed</Trans></TabsTrigger>
        </TabsList>
      </Tabs>
      {added?.ticket_key && (
        <p role="status" className="text-sm">
          <Trans>Added to the backlog as <Link href={`/tickets/${added.ticket_id ?? added.ticket_key}`} className="font-medium underline">{added.ticket_key}</Link>.</Trans>
        </p>
      )}
      <TriageView items={items} status={status} error={error} busy={busy} onPromote={(s) => void decide(s, true)} onDismiss={(s) => void decide(s, false)} />
    </div>
  );
}

// TriageView: the list (pure, for tests). Details render as markdown, as they will on the ticket; raw
// HTML from the public is never run (components/markdown).
export function TriageView({ items, status, error, busy, onPromote, onDismiss }: {
  items: IntakeSubmission[] | null; status: Status; error: string; busy: string | null;
  onPromote: (s: IntakeSubmission) => void; onDismiss: (s: IntakeSubmission) => void;
}) {
  const { i18n } = useLingui();
  if (error && items === null) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (items === null) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading requests…</Trans></p>;
  return (
    <>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {items.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{i18n._(EMPTY[status])}</p> : (
        <ul className="divide-y rounded-xl border">
          {items.map((s) => (
            <li key={s.id} className="grid gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={s.type} />
                <span className="min-w-0 flex-1 font-medium break-words">{s.title}</span>
                <span className="text-xs text-muted-foreground"><Trans>Received <When iso={s.created_at} /></Trans></span>
              </div>
              {s.details && <Markdown className="text-sm text-muted-foreground">{s.details}</Markdown>}
              {s.contact && <p className="text-xs text-muted-foreground"><Trans>Contact: <span className="text-foreground">{s.contact}</span></Trans></p>}
              {status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy === s.id} onClick={() => onPromote(s)}>{busy === s.id ? <Trans>Saving…</Trans> : <Trans>Add to backlog</Trans>}</Button>
                  <Button size="sm" variant="ghost" disabled={busy === s.id} onClick={() => onDismiss(s)}><Trans>Dismiss</Trans></Button>
                </div>
              ) : status === 'promoted' && s.ticket_key ? (
                <p className="text-xs text-muted-foreground"><Trans>Added as <Link href={`/tickets/${s.ticket_id ?? s.ticket_key}`} className="font-medium text-foreground underline">{s.ticket_key}</Link></Trans>{s.decided_at && <> <When iso={s.decided_at} /></>}</p>
              ) : s.decided_at && <p className="text-xs text-muted-foreground"><Trans>Dismissed <When iso={s.decided_at} /></Trans></p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
