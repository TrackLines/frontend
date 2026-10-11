'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TypeBadge } from '@/components/ticket-type';
import { When } from '@/components/when';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, intake, type IntakeSubmission } from '@/lib/api';

type Status = IntakeSubmission['status'];
const EMPTY: Record<Status, string> = {
  pending: 'No requests waiting. Share the request form link from Edit project to start collecting them.',
  promoted: 'Nothing added to the backlog from requests yet.',
  dismissed: 'Nothing dismissed.',
};

// Triage: requests sent through the project's public form. Each pending one is added to the backlog
// (as an unassigned ticket) or dismissed.
export function Triage({ projectId, token }: { projectId: string; token: string }) {
  const [status, setStatus] = useState<Status>('pending');
  const [items, setItems] = useState<IntakeSubmission[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<IntakeSubmission | null>(null);

  useEffect(() => {
    setItems(null);
    setError('');
    intake.submissions(projectId, token, status).then(setItems, (err) =>
      setError(err instanceof ApiError && err.status === 404 ? 'You don’t have access to this project’s requests.' : 'Couldn’t load requests. Please try again.'));
  }, [projectId, status]); // token refreshes must not refetch

  async function decide(s: IntakeSubmission, promote: boolean) {
    const ok = promote
      ? confirm(`Add “${s.title}” to the backlog as an unassigned ${s.type === 'bug' ? 'bug' : 'feature'}?`)
      : confirm(`Dismiss “${s.title}”? It won't become a ticket.`);
    if (!ok) return;
    setBusy(s.id);
    setError('');
    try {
      if (promote) setAdded(await intake.promote(s.id, token));
      else await intake.dismiss(s.id, token);
      setItems((list) => list?.filter((x) => x.id !== s.id) ?? list);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'Someone has already dealt with that request.' : 'Couldn’t save that. Please try again.');
      if (err instanceof ApiError && err.status === 409) setItems((list) => list?.filter((x) => x.id !== s.id) ?? list);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Tabs value={status} onValueChange={(v) => { setAdded(null); setStatus(v as Status); }}>
        <TabsList>
          <TabsTrigger value="pending">Waiting</TabsTrigger>
          <TabsTrigger value="promoted">Added</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>
      {added?.ticket_key && (
        <p role="status" className="text-sm">
          Added to the backlog as <Link href={`/tickets/${added.ticket_key}`} className="font-medium underline">{added.ticket_key}</Link>.
        </p>
      )}
      <TriageView items={items} status={status} error={error} busy={busy} onPromote={(s) => void decide(s, true)} onDismiss={(s) => void decide(s, false)} />
    </div>
  );
}

// TriageView: the list (pure, for tests). Request text is shown as plain text: it's from the public.
export function TriageView({ items, status, error, busy, onPromote, onDismiss }: {
  items: IntakeSubmission[] | null; status: Status; error: string; busy: string | null;
  onPromote: (s: IntakeSubmission) => void; onDismiss: (s: IntakeSubmission) => void;
}) {
  if (error && items === null) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (items === null) return <p role="status" className="text-sm text-muted-foreground">Loading requests…</p>;
  return (
    <>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {items.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{EMPTY[status]}</p> : (
        <ul className="divide-y rounded-xl border">
          {items.map((s) => (
            <li key={s.id} className="grid gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={s.type} />
                <span className="min-w-0 flex-1 font-medium break-words">{s.title}</span>
                <span className="text-xs text-muted-foreground">Received <When iso={s.created_at} /></span>
              </div>
              {s.details && <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">{s.details}</p>}
              {s.contact && <p className="text-xs text-muted-foreground">Contact: <span className="text-foreground">{s.contact}</span></p>}
              {status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy === s.id} onClick={() => onPromote(s)}>{busy === s.id ? 'Saving…' : 'Add to backlog'}</Button>
                  <Button size="sm" variant="ghost" disabled={busy === s.id} onClick={() => onDismiss(s)}>Dismiss</Button>
                </div>
              ) : status === 'promoted' && s.ticket_key ? (
                <p className="text-xs text-muted-foreground">Added as <Link href={`/tickets/${s.ticket_key}`} className="font-medium text-foreground underline">{s.ticket_key}</Link>{s.decided_at && <> <When iso={s.decided_at} /></>}</p>
              ) : s.decided_at && <p className="text-xs text-muted-foreground">Dismissed <When iso={s.decided_at} /></p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
