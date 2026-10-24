'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TicketKey } from '@/components/ticket/ticket-key';
import { ApiError, tickets, type TicketDetail, type TicketSearchResult } from '@/lib/api';

export function DuplicateLinks({ ticket }: { ticket: TicketDetail }) {
  const { t } = useLingui();
  if (!ticket.duplicate_of_id && ticket.resolution !== 'duplicate' && !ticket.duplicates?.length) return null;
  return (
    <section aria-label={t`Duplicate tickets`} className="grid gap-2 rounded-lg border p-4 text-sm">
      {ticket.resolution === 'duplicate' && (
        <p className="text-muted-foreground">
          {ticket.duplicate_of_id && ticket.duplicate_of_title
            ? <Trans>Duplicate of <Link href={`/tickets/${ticket.duplicate_of_id}`} className="font-medium text-foreground hover:underline"><TicketKey value={ticket.duplicate_of_key} /> {ticket.duplicate_of_title}</Link></Trans>
            : <Trans>Duplicate of a ticket that has been deleted</Trans>}
        </p>
      )}
      {(ticket.duplicates?.length ?? 0) > 0 && (
        <div className="grid gap-1">
          <p className="font-medium"><Trans>Duplicates</Trans></p>
          <ul className="grid gap-1">{ticket.duplicates!.map((d) => <li key={d.id}><Link className="hover:underline" href={`/tickets/${d.id}`}><TicketKey value={d.key} /> {d.title}</Link></li>)}</ul>
        </div>
      )}
    </section>
  );
}

// MarkDuplicate sits with the ticket's dependencies, closed behind its button like "Add a blocker…"
// (TL-258): it's a rare, closing action, so it doesn't sit open under the title. open: tests only.
export function MarkDuplicate({ ticket, token, onChanged, open: startOpen = false }: { ticket: TicketDetail; token: string; onChanged: () => void; open?: boolean }) {
  const { t } = useLingui();
  const [open, setOpen] = useState(startOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TicketSearchResult[]>([]);
  const [selected, setSelected] = useState<TicketSearchResult | null>(null);
  const [copyLabels, setCopyLabels] = useState(false);
  const [copyComments, setCopyComments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || selected) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void tickets.search({ text: q, project: ticket.project_id, limit: 8 }, token).then((found) => {
        if (!cancelled) setResults(found.filter((candidate) => candidate.id !== ticket.id && !candidate.duplicate_of_id && candidate.resolution !== 'duplicate'));
      }, () => { if (!cancelled) setResults([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, selected, ticket.id, ticket.project_id, token]);

  async function mark() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await tickets.duplicate(ticket.id, selected.id, { copy_labels: copyLabels, copy_comments: copyComments }, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? err.message : t`Couldn’t mark this ticket as a duplicate. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  if (ticket.duplicate_of_id || ticket.resolution === 'duplicate') return null;
  if (!open) {
    return (
      <section aria-labelledby={`duplicate-${ticket.id}`} className="grid gap-1.5">
        <p id={`duplicate-${ticket.id}`} className="text-xs font-medium text-muted-foreground uppercase"><Trans>Duplicate</Trans></p>
        <Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={() => setOpen(true)}><Trans>Mark as duplicate…</Trans></Button>
      </section>
    );
  }
  return (
    <section aria-labelledby={`duplicate-${ticket.id}`} className="grid gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id={`duplicate-${ticket.id}`} className="text-sm font-semibold"><Trans>Mark as duplicate</Trans></h2>
          <p className="text-sm text-muted-foreground"><Trans>Choose the original ticket in this project. This ticket will be closed.</Trans></p>
        </div>
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => { setOpen(false); setSelected(null); setQuery(''); }}><Trans>Cancel</Trans></Button>
      </div>
      {selected ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate"><TicketKey value={selected.key} /> {selected.title}</span>
          <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setSelected(null); setQuery(''); }}><Trans>Change</Trans></Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <Input aria-label={t`Find the original ticket`} placeholder={t`Search tickets by title or key…`} value={query} onChange={(e) => setQuery(e.target.value)} />
          {results.length > 0 && <ul className="max-h-48 overflow-y-auto rounded-md border">{results.map((candidate) => (
            <li key={candidate.id}><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setSelected(candidate)}><TicketKey value={candidate.key} /> <span className="truncate">{candidate.title}</span></button></li>
          ))}</ul>}
        </div>
      )}
      {selected && (
        <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={copyLabels} onChange={(e) => setCopyLabels(e.target.checked)} /> <Trans>Copy labels to the original</Trans></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={copyComments} onChange={(e) => setCopyComments(e.target.checked)} /> <Trans>Copy comments to the original</Trans></label>
          <Button type="button" size="sm" className="justify-self-start" disabled={saving} onClick={mark}>{saving ? <Trans>Marking…</Trans> : <Trans>Mark as duplicate</Trans>}</Button>
        </>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
