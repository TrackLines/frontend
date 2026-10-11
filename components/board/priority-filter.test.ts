import { expect, test } from 'bun:test';
import type { Ticket } from '@/lib/api';
import { filterTicketsByPriorities, parsePriorities, priorityQuery, ticketFilterQuery } from './priority-filter';

const tickets = [
  { id: 'urgent', priority: 'urgent' }, { id: 'high', priority: 'high' },
  { id: 'medium', priority: 'medium' }, { id: 'low', priority: 'low' }, { id: 'unset', priority: '' },
] as Ticket[];

test('no priorities selected shows all tickets; selected values combine as any-of', () => {
  expect(filterTicketsByPriorities(tickets, [])).toEqual(tickets);
  expect(filterTicketsByPriorities(tickets, ['urgent', 'high']).map((ticket) => ticket.id)).toEqual(['urgent', 'high']);
});

test('priority filters can produce an empty result', () => {
  expect(filterTicketsByPriorities(tickets, ['unknown'])).toEqual([]);
});

test('priority URL values round-trip, preserve other filters, and clear cleanly', () => {
  const query = priorityQuery('label=frontend&priority=low&priority=bad', ['urgent', 'high']);
  expect(parsePriorities(new URLSearchParams(query))).toEqual(['urgent', 'high']);
  expect(new URLSearchParams(query).get('label')).toBe('frontend');
  expect(priorityQuery(query, [])).toBe('label=frontend');
});

test('label and priority filters share the URL and clear together without dropping other state', () => {
  const query = ticketFilterQuery('ticket=t1&label=old&priority=low', ['frontend', 'search'], ['urgent', 'high']);
  const params = new URLSearchParams(query);
  expect(params.get('ticket')).toBe('t1');
  expect(params.get('label')).toBe('frontend,search');
  expect(params.getAll('priority')).toEqual(['urgent', 'high']);
  expect(ticketFilterQuery(query, [], [])).toBe('ticket=t1');
});
