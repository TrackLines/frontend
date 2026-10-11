import { expect, test } from 'bun:test';
import type { Ticket } from '@/lib/api';
import { filterTicketsByAssignee } from './assignee-filter';

const tickets = [
  { id: 'mine', assigned_to: 'u1' }, { id: 'other', assigned_to: 'u2' }, { id: 'none', assigned_to: null },
] as Ticket[];

test('assignee quick filters preserve all, show my work, or show unassigned tickets', () => {
  expect(filterTicketsByAssignee(tickets, 'all', 'u1')).toEqual(tickets);
  expect(filterTicketsByAssignee(tickets, 'mine', 'u1').map((ticket) => ticket.id)).toEqual(['mine']);
  expect(filterTicketsByAssignee(tickets, 'unassigned', 'u1').map((ticket) => ticket.id)).toEqual(['none']);
  expect(filterTicketsByAssignee(tickets, 'mine', '').length).toBe(0);
});
