'use client';

import { HistoryIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { When } from '@/components/when';
import { tickets, type Assignee, type HistoryEntry } from '@/lib/api';
import { personLabel } from '@/lib/people';

// HistoryPanel: the ticket's lifecycle (TL-76), on the full ticket page only: it's detail for looking
// back, not for working the board, so the board's dialog and side view leave it out.
export function HistoryPanel({ ticketId, token, people }: { ticketId: string; token: string; people: Assignee[] | null }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  useEffect(() => {
    tickets.history(ticketId, token).then(setEntries, () => setEntries(null)); // no panel rather than an error
  }, [ticketId]); // token refreshes must not refetch
  return entries && <HistoryPanelView entries={entries} people={people} />;
}

export type HistoryStep = { at: string; who: string; text: string; skipped: string[] };

const RESOLVED: Record<NonNullable<HistoryEntry['resolution']>, string> = { done: 'done', wont_do: 'won’t do', duplicate: 'a duplicate' };

// historySteps turns entries into what happened, newest first: skipped stages fold into the move that
// skipped them ("moved it to Done", skipped In progress), and the first step says where it was made.
export function historySteps(entries: HistoryEntry[], people: Assignee[] | null): HistoryStep[] {
  const steps: HistoryStep[] = [];
  let skipped: string[] = [];
  let first = true;
  for (const e of entries) {
    if (e.outcome === 'skipped') {
      skipped.push(e.stage === 'backlog' ? 'the backlog' : e.column_name ?? 'a column');
      continue;
    }
    const where = e.stage === 'backlog' ? 'the backlog' : `${e.column_name}${e.board_name ? ` on ${e.board_name}` : ''}`;
    const text = e.stage === 'resolved'
      ? `closed it as ${RESOLVED[e.resolution ?? 'done']}`
      : first ? `created it in ${where}` : e.stage === 'backlog' ? 'sent it to the backlog' : `moved it to ${where}`;
    // made straight on a board: skipping the backlog is how every board ticket starts, not news
    const shown = first ? skipped.filter((s) => s !== 'the backlog') : skipped;
    steps.push({ at: e.at, who: e.actor ? personLabel(e.actor, people) : 'TrackLin.es', text, skipped: shown });
    skipped = [];
    first = false;
  }
  return steps.reverse();
}

// HistoryPanelView: the list (pure, for tests).
export function HistoryPanelView({ entries, people }: { entries: HistoryEntry[]; people: Assignee[] | null }) {
  const steps = historySteps(entries, people);
  return (
    <section aria-label="History" className="grid gap-2 rounded-lg border p-3 text-sm">
      <h2 className="flex items-center gap-1.5 font-semibold"><HistoryIcon className="size-4" aria-hidden /> History</h2>
      {steps.length === 0 ? (
        <p className="text-muted-foreground">Nothing recorded yet. History is kept from October 2026.</p>
      ) : (
        <ol className="grid gap-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-medium">{s.who}</span>
              <span>{s.text}</span>
              {s.skipped.length > 0 && <span className="text-muted-foreground">(skipped {s.skipped.join(', ')})</span>}
              <When iso={s.at} className="text-xs text-muted-foreground" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
