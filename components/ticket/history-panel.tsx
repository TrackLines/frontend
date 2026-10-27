'use client';

import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { HistoryIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { When } from '@/components/when';
import { ApiError, tickets, type Assignee, type HistoryEntry } from '@/lib/api';
import { personLabel } from '@/lib/people';

// HistoryPanel: the ticket's lifecycle (TL-76), on the full ticket page only: it's detail for looking
// back, not for working the board, so the board's dialog and side view leave it out.
export function HistoryPanel({ ticketId, token, people }: { ticketId: string; token: string; people: Assignee[] | null }) {
  const [entries, setEntries] = useState<HistoryEntry[] | 'unavailable' | null>(null);
  useEffect(() => {
    // no panel rather than an error, except when the history is held elsewhere and can't be reached
    // (TL-667): then say so, so it doesn't look like there's none
    tickets.history(ticketId, token).then(setEntries, (err) => setEntries(err instanceof ApiError && err.code === 'history_unavailable' ? 'unavailable' : null));
  }, [ticketId]); // token refreshes must not refetch
  // opened from the board's History button (/tickets/<id>#history): the panel loads after the page,
  // so the browser's own jump to #history found nothing; go there once it's here
  useEffect(() => {
    if (entries && window.location.hash === '#history') document.getElementById('history')?.scrollIntoView({ block: 'start' });
  }, [entries !== null]);
  return entries && <HistoryPanelView entries={entries} people={people} />;
}

export type HistoryStep = { at: string; who: string; text: string; skipped: string[] };

const RESOLVED: Record<NonNullable<HistoryEntry['resolution']>, MessageDescriptor> = { done: msg`closed it as done`, wont_do: msg`closed it as won’t do`, duplicate: msg`closed it as a duplicate` };

// historySteps turns entries into what happened, newest first: skipped stages fold into the move that
// skipped them ("moved it to Done", skipped In progress), and the first step says where it was made.
export function historySteps(i18n: I18n, entries: HistoryEntry[], people: Assignee[] | null): HistoryStep[] {
  const backlog = i18n._(msg`the backlog`);
  const steps: HistoryStep[] = [];
  let skipped: string[] = [];
  let first = true;
  for (const e of entries) {
    if (e.outcome === 'skipped') {
      skipped.push(e.stage === 'backlog' ? backlog : e.column_name ?? i18n._(msg`a column`));
      continue;
    }
    const column = e.column_name ?? '';
    const board = e.board_name;
    const where = e.stage === 'backlog' ? backlog : board ? i18n._(msg`${column} on ${board}`) : column;
    const text = e.stage === 'resolved'
      ? i18n._(RESOLVED[e.resolution ?? 'done'])
      : first ? i18n._(msg`created it in ${where}`) : e.stage === 'backlog' ? i18n._(msg`sent it to the backlog`) : i18n._(msg`moved it to ${where}`);
    // made straight on a board: skipping the backlog is how every board ticket starts, not news
    const shown = first ? skipped.filter((s) => s !== backlog) : skipped;
    steps.push({ at: e.at, who: e.actor ? personLabel(i18n, e.actor, people) : 'TrackLin.es', text, skipped: shown });
    skipped = [];
    first = false;
  }
  return steps.reverse();
}

// HistoryPanelView: the list (pure, for tests).
export function HistoryPanelView({ entries, people }: { entries: HistoryEntry[] | 'unavailable'; people: Assignee[] | null }) {
  const { i18n } = useLingui();
  const steps = entries === 'unavailable' ? [] : historySteps(i18n, entries, people);
  return (
    <section id="history" aria-label={i18n._(msg`History`)} className="grid scroll-mt-4 gap-2 rounded-lg border p-3 text-sm">
      <h2 className="flex items-center gap-1.5 font-semibold"><HistoryIcon className="size-4" aria-hidden /> <Trans>History</Trans></h2>
      {entries === 'unavailable' ? (
        <p role="status" className="text-muted-foreground"><Trans>History can’t be loaded right now. Try again shortly.</Trans></p>
      ) : steps.length === 0 ? (
        <p className="text-muted-foreground"><Trans>Nothing recorded yet. History is kept from October 2026.</Trans></p>
      ) : (
        <ol className="grid gap-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-medium">{s.who}</span>
              <span>{s.text}</span>
              {s.skipped.length > 0 && <span className="text-muted-foreground"><Trans>(skipped {s.skipped.join(', ')})</Trans></span>}
              <When iso={s.at} className="text-xs text-muted-foreground" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
