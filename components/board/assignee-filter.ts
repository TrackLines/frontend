import type { Ticket } from '@/lib/api';

export type AssigneeFilter = 'all' | 'mine' | 'unassigned';

export function filterTicketsByAssignee(tickets: Ticket[], filter: AssigneeFilter, userId: string): Ticket[] {
  if (filter === 'all') return tickets;
  if (filter === 'mine') return userId ? tickets.filter((ticket) => ticket.assigned_to === userId) : [];
  return tickets.filter((ticket) => !ticket.assigned_to);
}
