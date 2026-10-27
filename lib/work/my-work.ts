import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import type { TicketSearchResult } from '../api';

export type WorkMode = 'assigned' | 'created';

// workQuery: which search filter a My work tab uses — tickets assigned to me, or ones I raised.
export const workQuery = (mode: WorkMode): { assignee: 'me' } | { creator: 'me' } =>
  mode === 'created' ? { creator: 'me' } : { assignee: 'me' };

export type WorkGroup = { project: string; boards: { name: string; tickets: TicketSearchResult[] }[] };

// groupWork puts my tickets under their project, then their board (or the backlog), keeping the
// order they came in (most recently changed first) for both the groups and the tickets.
export function groupWork(i18n: I18n, tickets: TicketSearchResult[]): WorkGroup[] {
  const groups: WorkGroup[] = [];
  for (const t of tickets) {
    let g = groups.find((x) => x.project === t.project_name);
    if (!g) groups.push((g = { project: t.project_name, boards: [] }));
    const board = t.board_name ?? i18n._(msg`Backlog`);
    let b = g.boards.find((x) => x.name === board);
    if (!b) g.boards.push((b = { name: board, tickets: [] }));
    b.tickets.push(t);
  }
  return groups;
}

// boardOptions are the boards my tickets are on, for the board filter (backlog has none).
export function boardOptions(tickets: TicketSearchResult[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const t of tickets) if (t.board_id && t.board_name) seen.set(t.board_id, `${t.project_name} · ${t.board_name}`);
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// countLabel: "Showing 5 of 9 tickets" when a list shows only part of what matches; null when it shows it all.
export function countLabel(i18n: I18n, shown: number, total: number): string | null {
  return total > shown ? i18n._(msg`Showing ${shown} of ${plural(total, { one: '# ticket', other: '# tickets' })}`) : null;
}
