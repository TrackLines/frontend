import type { TicketSearchResult } from './api';

export type WorkGroup = { project: string; boards: { name: string; tickets: TicketSearchResult[] }[] };

// groupWork puts my tickets under their project, then their board (or the backlog), keeping the
// order they came in (most recently changed first) for both the groups and the tickets.
export function groupWork(tickets: TicketSearchResult[]): WorkGroup[] {
  const groups: WorkGroup[] = [];
  for (const t of tickets) {
    let g = groups.find((x) => x.project === t.project_name);
    if (!g) groups.push((g = { project: t.project_name, boards: [] }));
    const board = t.board_name ?? 'Backlog';
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
