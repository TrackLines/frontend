import type { TicketDetail } from '@/lib/api';

type Where = Pick<TicketDetail, 'board_id' | 'project_id' | 'done'>;

// ticketActions: what the edit dialog offers on the ticket page. Send to backlog only from a board;
// won't do only for a backlog ticket that's still open.
export const ticketActions = (t: Where) => ({ sendToBacklog: Boolean(t.board_id), wontDo: !t.board_id && !t.done });

// afterDelete: where a deleted ticket's page goes: its board, or the project's backlog.
export const afterDelete = (t: Where) => (t.board_id ? `/boards/${t.board_id}` : `/projects/${t.project_id}#backlog`);

// closedAs: how a finished ticket's line reads, or null while it's open.
export function closedAs(t: Pick<TicketDetail, 'done_at' | 'resolution' | 'resolved_at'>): string | null {
  if (!t.done_at) return null;
  if (t.resolution === 'duplicate') return 'marked duplicate';
  if (t.resolution === 'wont_do') return 'closed as won’t do';
  return t.resolved_at ? 'resolved' : 'done';
}
