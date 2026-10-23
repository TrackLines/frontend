import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { TicketDetail } from '@/lib/api';

type Where = Pick<TicketDetail, 'board_id' | 'project_id' | 'done'>;

// ticketActions: what the edit dialog offers on the ticket page. Send to backlog only from a board;
// won't do only for a backlog ticket that's still open.
export const ticketActions = (t: Where) => ({ sendToBacklog: Boolean(t.board_id), wontDo: !t.board_id && !t.done });

// afterDelete: where a deleted ticket's page goes: its board, or the project's backlog.
export const afterDelete = (t: Where) => (t.board_id ? `/boards/${t.board_id}` : `/projects/${t.project_id}#backlog`);

// closedAs: how a finished ticket's line reads, or null while it's open.
export function closedAs(i18n: I18n, t: Pick<TicketDetail, 'done_at' | 'resolution' | 'resolved_at'>): string | null {
  if (!t.done_at) return null;
  if (t.resolution === 'duplicate') return i18n._(msg`marked duplicate`);
  if (t.resolution === 'wont_do') return i18n._(msg`closed as won’t do`);
  return t.resolved_at ? i18n._(msg`resolved`) : i18n._(msg`done`);
}
