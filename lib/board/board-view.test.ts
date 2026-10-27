import { expect, test } from 'bun:test';
import { boardAccess, canAddTicket, shownTickets, type BoardFilters } from './board-view';
import type { Ticket } from '@/lib/api';

const t = (id: string, extra: Partial<Ticket> = {}): Ticket => ({ id, column_id: 'c', position: 0, title: id, description: '', created_by: 'x', ...extra });
const tickets = [
  t('mine-urgent-ui', { assigned_to: 'me', priority: 'urgent', labels: ['ui'] }),
  t('bo-low-api', { assigned_to: 'bo', priority: 'low', labels: ['api'] }),
  t('nobody-urgent-api', { priority: 'urgent', labels: ['api'] }),
];
const none: BoardFilters = { labels: [], priorities: [], assignee: 'all', me: 'me', turn: null };
const ids = (f: Partial<BoardFilters>) => shownTickets(tickets, { ...none, ...f }).map((x) => x.id);

test('the board filters combine: labels, priorities, mine / unassigned', () => {
  expect(ids({})).toEqual(['mine-urgent-ui', 'bo-low-api', 'nobody-urgent-api']);
  expect(ids({ labels: ['api'] })).toEqual(['bo-low-api', 'nobody-urgent-api']);
  expect(ids({ labels: ['api'], priorities: ['urgent'] })).toEqual(['nobody-urgent-api']);
  expect(ids({ assignee: 'mine' })).toEqual(['mine-urgent-ui']);
  expect(ids({ assignee: 'unassigned', priorities: ['urgent'] })).toEqual(['nobody-urgent-api']);
});

test('in standup only the speaker’s tickets show', () => {
  expect(ids({ turn: 'bo' })).toEqual(['bo-low-api']);
  expect(ids({ turn: 'bo', labels: ['ui'] })).toEqual([]);
});

test('board settings open only with permissions checked for this board (fail closed)', () => {
  expect(boardAccess({ checkedBoard: 'b1', board: 'b1', canManage: true, isAdmin: true })).toEqual({ manage: true, admin: true });
  expect(boardAccess({ checkedBoard: 'b0', board: 'b1', canManage: true, isAdmin: true })).toEqual({ manage: false, admin: false });
  expect(boardAccess({ checkedBoard: 'b1', board: 'b1', canManage: null, isAdmin: false })).toEqual({ manage: false, admin: false });
});

test('"+ Add ticket": not on archived boards, not in Done unless it is the only column', () => {
  expect(canAddTicket({ archived: false, done: false, columns: 3 })).toBe(true);
  expect(canAddTicket({ archived: true, done: false, columns: 3 })).toBe(false);
  expect(canAddTicket({ archived: false, done: true, columns: 3 })).toBe(false);
  expect(canAddTicket({ archived: false, done: true, columns: 1 })).toBe(true);
});
