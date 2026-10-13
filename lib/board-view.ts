import type { Ticket } from '@/lib/api';
import { filterTicketsByAssignee, type AssigneeFilter } from '@/components/board/assignee-filter';
import { filterTicketsByLabels } from '@/components/board/label-filter';
import { filterTicketsByPriorities } from '@/components/board/priority-filter';

export type BoardFilters = { labels: string[]; priorities: string[]; assignee: AssigneeFilter; me: string; turn: string | null; editing: boolean };

// shownTickets: a column's tickets as the board shows them. Editing shows every ticket; otherwise the
// label, priority and assignee filters apply, and during standup only the speaker's tickets.
export function shownTickets(tickets: Ticket[], f: BoardFilters): Ticket[] {
  if (f.editing) return tickets;
  return filterTicketsByAssignee(filterTicketsByPriorities(filterTicketsByLabels(tickets, f.labels), f.priorities), f.assignee, f.me)
    .filter((t) => !f.turn || t.assigned_to === f.turn);
}

// boardAccess: settings are open only with permissions loaded for this board (fail closed: a check
// for another board, or one that failed, grants nothing).
export function boardAccess(p: { checkedBoard: string; board: string; canManage: boolean | null; isAdmin: boolean; editMode: boolean }) {
  const ours = p.checkedBoard === p.board;
  const manage = ours && p.canManage === true;
  return { manage, admin: ours && p.isAdmin, editing: p.editMode && manage };
}

// canAddTicket: "+ Add ticket" shows outside edit mode, on live boards, and never in Done (tickets get
// there by moving), unless Done is the only column.
export const canAddTicket = (p: { editing: boolean; archived: boolean; done: boolean; columns: number }) =>
  !p.editing && !p.archived && !(p.done && p.columns > 1);
